import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { FichaTecnicaService } from "../src/ficha-tecnica/ficha-tecnica.service";
import {
    Fixtures,
    cleanupConcurrencyFixtures,
    createConcurrencyFixtures,
    createPedidoFicha,
    password,
    runId,
} from "./concurrency-fixtures";

describe("Sincronização ficha-parceiro (E2E)", () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let fichaService: FichaTecnicaService;
    let fixtures: Fixtures;
    let token: string;
    const parceiros: number[] = [];
    let ficha: { pedidoId: number; fichaId: number };

    const auth = () => ({ Authorization: `Bearer ${token}` });
    const putMatriz = (qtd: number) =>
        request(app.getHttpServer())
            .put(`/fichas-tecnicas/${ficha.fichaId}/matriz`)
            .set(auth())
            .send({
                itens: [
                    {
                        cor_id: fixtures.corId,
                        grade_versao_item_id: fixtures.gradeVersaoItemId,
                        quantidade: qtd,
                    },
                ],
            });
    const relacoes = () =>
        prisma.fichaParceiro.findMany({
            where: { ficha_id: ficha.fichaId },
            orderBy: { parceiro_id: "asc" },
        });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();
        prisma = app.get(PrismaService);
        fichaService = app.get(FichaTecnicaService);
        fixtures = await createConcurrencyFixtures(prisma);

        for (const sufixo of ["a", "b"]) {
            const p = await prisma.parceiro.create({
                data: {
                    nome: `${runId}-parceiro-${sufixo}`,
                    categoria: "Costura",
                    fabrico_id: fixtures.fabricoId,
                },
            });
            parceiros.push(p.id);
            await prisma.parceiroProduto.create({
                data: { produto_id: fixtures.produtoId, parceiro_id: p.id, preco: 10 },
            });
        }

        const login = await request(app.getHttpServer())
            .post("/usuarios/login")
            .send({ email: fixtures.email, senha: password })
            .expect(201);
        token = login.body.accessToken as string;
    });

    beforeEach(async () => {
        ficha = await createPedidoFicha(prisma, fixtures, fixtures.etapas[0].id);
    });

    afterEach(() => jest.restoreAllMocks());

    afterAll(async () => {
        if (prisma && fixtures) {
            await prisma.fichaParceiro.deleteMany({
                where: { ficha: { fabrico_id: fixtures.fabricoId } },
            });
            await prisma.parceiroProduto.deleteMany({
                where: { produto_id: fixtures.produtoId },
            });
            await prisma.parceiro.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
            await cleanupConcurrencyFixtures(prisma, fixtures);
        }
        if (app) await app.close();
    });

    it("nenhum parceiro: altera a quantidade sem erro", async () => {
        await putMatriz(5).expect(200);
        expect(await relacoes()).toHaveLength(0);
    });

    it("um parceiro: acompanha o total e recalcula o valor (aumento e redução)", async () => {
        await prisma.fichaParceiro.create({
            data: { ficha_id: ficha.fichaId, parceiro_id: parceiros[0], quantidade: 1, valor: 10 },
        });

        await putMatriz(8).expect(200);
        let [rel] = await relacoes();
        expect(rel.quantidade).toBe(8);
        expect(Number(rel.valor)).toBe(80);

        await putMatriz(3).expect(200);
        [rel] = await relacoes();
        expect(rel.quantidade).toBe(3);
        expect(Number(rel.valor)).toBe(30);
    });

    it("vários, todos com quantidade: preserva", async () => {
        await prisma.fichaParceiro.createMany({
            data: [
                { ficha_id: ficha.fichaId, parceiro_id: parceiros[0], quantidade: 4, valor: 40 },
                { ficha_id: ficha.fichaId, parceiro_id: parceiros[1], quantidade: 6, valor: 60 },
            ],
        });

        await putMatriz(20).expect(200);

        const rels = await relacoes();
        expect(rels.map((r) => r.quantidade)).toEqual([4, 6]);
        expect(rels.map((r) => Number(r.valor))).toEqual([40, 60]);
    });

    it("vários, um sem quantidade: zera todos (quantidade e valor)", async () => {
        await prisma.fichaParceiro.createMany({
            data: [
                { ficha_id: ficha.fichaId, parceiro_id: parceiros[0], quantidade: 4, valor: 40 },
                { ficha_id: ficha.fichaId, parceiro_id: parceiros[1], quantidade: 0 },
            ],
        });

        await putMatriz(10).expect(200);

        const rels = await relacoes();
        expect(rels.every((r) => r.quantidade === 0 && Number(r.valor) === 0)).toBe(true);
    });

    it("chamada direta à API (PUT /fichas-tecnicas/:id só com quantidade)", async () => {
        await prisma.fichaParceiro.create({
            data: { ficha_id: ficha.fichaId, parceiro_id: parceiros[0], quantidade: 1, valor: 10 },
        });

        await request(app.getHttpServer())
            .put(`/fichas-tecnicas/${ficha.fichaId}`)
            .set(auth())
            .send({ quantidade: 7 })
            .expect(200);

        const [rel] = await relacoes();
        expect(rel.quantidade).toBe(7);
        expect(Number(rel.valor)).toBe(70);
    });

    it("falha intermediária: nada persiste (ficha nem relações)", async () => {
        await prisma.fichaParceiro.createMany({
            data: [
                { ficha_id: ficha.fichaId, parceiro_id: parceiros[0], quantidade: 4, valor: 40 },
                { ficha_id: ficha.fichaId, parceiro_id: parceiros[1], quantidade: 0 },
            ],
        });
        const antes = await relacoes();
        const fichaAntes = await prisma.fichaTecnica.findUniqueOrThrow({
            where: { id: ficha.fichaId },
        });

        jest.spyOn(fichaService, "sincronizarPedido").mockRejectedValueOnce(
            new Error("falha simulada"),
        );

        await putMatriz(10).expect(500);

        expect(await relacoes()).toEqual(antes);
        const fichaDepois = await prisma.fichaTecnica.findUniqueOrThrow({
            where: { id: ficha.fichaId },
        });
        expect(fichaDepois.quantidade).toBe(fichaAntes.quantidade);
    });

    it("chamada direta com vários parceiros, um sem quantidade: zera todos", async () => {
        await prisma.fichaParceiro.createMany({
            data: [
                { ficha_id: ficha.fichaId, parceiro_id: parceiros[0], quantidade: 4, valor: 40 },
                { ficha_id: ficha.fichaId, parceiro_id: parceiros[1], quantidade: 0 },
            ],
        });

        await request(app.getHttpServer())
            .put(`/fichas-tecnicas/${ficha.fichaId}`)
            .set(auth())
            .send({ quantidade: 7 })
            .expect(200);

        const rels = await relacoes();
        expect(rels.every((r) => r.quantidade === 0 && Number(r.valor) === 0)).toBe(true);
    });
});
