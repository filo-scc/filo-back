import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { TipoCor } from "@prisma/client";
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

type ItemMatriz = { cor_id: number; grade_versao_item_id: number; quantidade: number };

describe("PUT /fichas-tecnicas/:id/matriz (E2E)", () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let fichaService: FichaTecnicaService;
    let fixtures: Fixtures;
    let token: string;

    const extras = {
        tamanhoId: 0,
        gradeVersaoItemId: 0,
        gradeVersaoOutraItemId: 0,
        corId: 0,
        outroFabricoId: 0,
        corOutroFabricoId: 0,
    };

    let ficha: { pedidoId: number; fichaId: number };
    let matrizOriginal: ItemMatriz[];
    let novaMatriz: ItemMatriz[];

    const auth = () => ({ Authorization: `Bearer ${token}` });

    const put = (fichaId: number, itens: unknown, perdas: object = {}) =>
        request(app.getHttpServer())
            .put(`/fichas-tecnicas/${fichaId}/matriz`)
            .set(auth())
            .send({ itens, ...perdas });

    const matrizCom = (quantidade: number): ItemMatriz[] => [
        { cor_id: fixtures.corId, grade_versao_item_id: fixtures.gradeVersaoItemId, quantidade },
    ];

    const snapshot = async () => {
        const [itens, fichaDb, pedidoDb] = await Promise.all([
            prisma.fichaTecnicaItem.findMany({
                where: { ficha_tecnica_id: ficha.fichaId },
                orderBy: { id: "asc" },
            }),
            prisma.fichaTecnica.findUniqueOrThrow({ where: { id: ficha.fichaId } }),
            prisma.pedido.findUniqueOrThrow({ where: { id: ficha.pedidoId } }),
        ]);
        return { itens, fichaDb, pedidoDb };
    };

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

        const tamanho2 = await prisma.tamanho.create({
            data: { codigo: `${runId}-M`, ordem_global: Math.floor(Math.random() * 1000000) },
        });
        extras.tamanhoId = tamanho2.id;
        const gvi2 = await prisma.gradeVersaoItem.create({
            data: {
                grade_versao_id: fixtures.gradeVersaoId,
                tamanho_id: tamanho2.id,
                posicao: 2,
            },
        });
        extras.gradeVersaoItemId = gvi2.id;

        const versao2 = await prisma.gradeVersao.create({
            data: { grade_id: fixtures.gradeId, versao: 2, ativo: true },
        });
        const gviOutra = await prisma.gradeVersaoItem.create({
            data: { grade_versao_id: versao2.id, tamanho_id: tamanho2.id, posicao: 1 },
        });
        extras.gradeVersaoOutraItemId = gviOutra.id;

        const cor2 = await prisma.cor.create({
            data: {
                nome: `${runId}-cor-2`,
                codigo_hex: "#000000",
                tipo: TipoCor.COR,
                fabrico_id: fixtures.fabricoId,
            },
        });
        extras.corId = cor2.id;

        const outroFabrico = await prisma.fabrico.create({
            data: {
                nome_fantasia: `${runId}-outro-fabrico`,
                razao_social: `${runId}-outro-razao`,
                cnpj: `31${Date.now().toString().slice(-12)}`,
            },
        });
        extras.outroFabricoId = outroFabrico.id;
        const corOutra = await prisma.cor.create({
            data: {
                nome: `${runId}-cor-outro-fabrico`,
                codigo_hex: "#111111",
                tipo: TipoCor.COR,
                fabrico_id: outroFabrico.id,
            },
        });
        extras.corOutroFabricoId = corOutra.id;

        const login = await request(app.getHttpServer())
            .post("/usuarios/login")
            .send({ email: fixtures.email, senha: password })
            .expect(201);
        token = login.body.accessToken as string;
    });

    beforeEach(async () => {
        ficha = await createPedidoFicha(prisma, fixtures, fixtures.etapas[0].id);

        matrizOriginal = [
            {
                cor_id: fixtures.corId,
                grade_versao_item_id: fixtures.gradeVersaoItemId,
                quantidade: 4,
            },
            {
                cor_id: fixtures.corId,
                grade_versao_item_id: extras.gradeVersaoItemId,
                quantidade: 6,
            },
        ];
        await prisma.fichaTecnicaItem.createMany({
            data: matrizOriginal.map((i) => ({ ficha_tecnica_id: ficha.fichaId, ...i })),
        });
        await prisma.fichaTecnica.update({
            where: { id: ficha.fichaId },
            data: { quantidade: 10 },
        });
        await prisma.pedido.update({ where: { id: ficha.pedidoId }, data: { quantidade: 10 } });

        novaMatriz = [
            {
                cor_id: fixtures.corId,
                grade_versao_item_id: fixtures.gradeVersaoItemId,
                quantidade: 2,
            },
            {
                cor_id: extras.corId,
                grade_versao_item_id: fixtures.gradeVersaoItemId,
                quantidade: 3,
            },
            { cor_id: extras.corId, grade_versao_item_id: extras.gradeVersaoItemId, quantidade: 4 },
        ];
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        if (prisma && fixtures) {
            await cleanupConcurrencyFixtures(prisma, fixtures);
            await prisma.cor.deleteMany({ where: { fabrico_id: extras.outroFabricoId } });
            await prisma.fabrico.deleteMany({ where: { id: extras.outroFabricoId } });
            await prisma.tamanho.deleteMany({ where: { id: extras.tamanhoId } });
        }
        if (app) await app.close();
    });

    // ---------- caminho feliz ----------

    it("substitui a matriz, atualiza a quantidade da ficha e os totais do pedido", async () => {
        const res = await put(ficha.fichaId, novaMatriz).expect(200);

        expect(res.body.quantidade).toBe(9);
        expect(res.body.data).toHaveLength(3);

        const depois = await snapshot();
        expect(
            depois.itens.map((i) => ({
                cor_id: i.cor_id,
                grade_versao_item_id: i.grade_versao_item_id,
                quantidade: i.quantidade,
            })),
        ).toEqual(expect.arrayContaining(novaMatriz));
        expect(depois.itens).toHaveLength(3);
        expect(depois.fichaDb.quantidade).toBe(9);
        expect(depois.pedidoDb.quantidade).toBe(9); // a ficha é a única do pedido
    });

    // ---------- rollback ----------

    it("ROLLBACK: falha simulada no último passo não persiste nada", async () => {
        const antes = await snapshot();

        jest.spyOn(fichaService, "sincronizarPedido").mockRejectedValueOnce(
            new Error("falha simulada"),
        );

        await put(ficha.fichaId, novaMatriz).expect(500);

        const depois = await snapshot();
        // mesmos ids: se o delete+create tivesse persistido, os ids seriam outros
        expect(depois.itens).toEqual(antes.itens);
        expect(depois.fichaDb.quantidade).toBe(antes.fichaDb.quantidade);
        expect(depois.pedidoDb.quantidade).toBe(antes.pedidoDb.quantidade);
        expect(depois.pedidoDb.custo_total).toEqual(antes.pedidoDb.custo_total);
    });

    it("ROLLBACK: falha real no meio (perdas > nova quantidade) retorna 400 sem persistir", async () => {
        await prisma.fichaTecnica.update({
            where: { id: ficha.fichaId },
            data: { defeitos_costura: 10 },
        });
        const antes = await snapshot();

        await put(ficha.fichaId, novaMatriz).expect(400);

        const depois = await snapshot();
        expect(depois.itens).toEqual(antes.itens);
        expect(depois.fichaDb.quantidade).toBe(antes.fichaDb.quantidade);
        expect(depois.pedidoDb.quantidade).toBe(antes.pedidoDb.quantidade);
    });

    // ---------- perdas no mesmo request ----------

    it("aumenta quantidade e perdas juntas", async () => {
        await prisma.fichaTecnica.update({
            where: { id: ficha.fichaId },
            data: { defeitos_costura: 8 },
        });

        await put(ficha.fichaId, matrizCom(20), { defeitos_costura: 15 }).expect(200);

        const depois = await snapshot();
        expect(depois.fichaDb.quantidade).toBe(20);
        expect(depois.fichaDb.defeitos_costura).toBe(15);
        expect(depois.pedidoDb.quantidade).toBe(20);
    });

    it("reduz quantidade e perdas juntas", async () => {
        await prisma.fichaTecnica.update({
            where: { id: ficha.fichaId },
            data: { defeitos_costura: 8 },
        });

        await put(ficha.fichaId, matrizCom(3), { defeitos_costura: 2 }).expect(200);

        const depois = await snapshot();
        expect(depois.fichaDb.quantidade).toBe(3);
        expect(depois.fichaDb.defeitos_costura).toBe(2);
        expect(depois.pedidoDb.quantidade).toBe(3);
    });

    it("perdas enviadas maiores que a nova quantidade: 400 e nada muda", async () => {
        const antes = await snapshot();

        await put(ficha.fichaId, novaMatriz, { defeitos_costura: 12 }).expect(400);

        const depois = await snapshot();
        expect(depois.itens).toEqual(antes.itens);
        expect(depois.fichaDb.quantidade).toBe(antes.fichaDb.quantidade);
        expect(depois.fichaDb.defeitos_costura).toBe(antes.fichaDb.defeitos_costura);
        expect(depois.pedidoDb.quantidade).toBe(antes.pedidoDb.quantidade);
    });

    it("soma as perdas enviadas com as gravadas que não foram enviadas", async () => {
        await prisma.fichaTecnica.update({
            where: { id: ficha.fichaId },
            data: { retiradas: 6 },
        });

        await put(ficha.fichaId, novaMatriz, { defeitos_costura: 4 }).expect(400);

        const depois = await snapshot();
        expect(depois.fichaDb.quantidade).toBe(10);
    });

    it("sem perdas no request mantém as gravadas", async () => {
        await prisma.fichaTecnica.update({
            where: { id: ficha.fichaId },
            data: { defeitos_tecido: 2 },
        });

        await put(ficha.fichaId, novaMatriz).expect(200);

        const depois = await snapshot();
        expect(depois.fichaDb.quantidade).toBe(9);
        expect(depois.fichaDb.defeitos_tecido).toBe(2);
    });

    it("perda negativa retorna 400 (DTO)", async () => {
        await put(ficha.fichaId, novaMatriz, { sobras: -1 }).expect(400);

        const depois = await snapshot();
        expect(depois.fichaDb.quantidade).toBe(10);
    });

    // ---------- 409 ----------

    it("ficha concluída retorna 409 e não altera nada", async () => {
        await prisma.fichaTecnica.update({
            where: { id: ficha.fichaId },
            data: { concluida: true },
        });
        const antes = await snapshot();

        await put(ficha.fichaId, novaMatriz).expect(409);

        const depois = await snapshot();
        expect(depois.itens).toEqual(antes.itens);
        expect(depois.fichaDb.quantidade).toBe(antes.fichaDb.quantidade);
    });

    it("pedido finalizado retorna 409 e não altera nada", async () => {
        await prisma.pedido.update({ where: { id: ficha.pedidoId }, data: { finalizado: true } });
        const antes = await snapshot();

        await put(ficha.fichaId, novaMatriz).expect(409);

        const depois = await snapshot();
        expect(depois.itens).toEqual(antes.itens);
        expect(depois.fichaDb.quantidade).toBe(antes.fichaDb.quantidade);
        expect(depois.pedidoDb.quantidade).toBe(antes.pedidoDb.quantidade);
    });

    // ---------- 400 ----------

    it("cor de outro fabrico retorna 400 e não altera nada", async () => {
        const antes = await snapshot();

        await put(ficha.fichaId, [
            {
                cor_id: extras.corOutroFabricoId,
                grade_versao_item_id: fixtures.gradeVersaoItemId,
                quantidade: 1,
            },
        ]).expect(400);

        const depois = await snapshot();
        expect(depois.itens).toEqual(antes.itens);
        expect(depois.fichaDb.quantidade).toBe(antes.fichaDb.quantidade);
    });

    it("item de outra grade versão retorna 400 e não altera nada", async () => {
        const antes = await snapshot();

        await put(ficha.fichaId, [
            {
                cor_id: fixtures.corId,
                grade_versao_item_id: extras.gradeVersaoOutraItemId,
                quantidade: 1,
            },
        ]).expect(400);

        const depois = await snapshot();
        expect(depois.itens).toEqual(antes.itens);
        expect(depois.fichaDb.quantidade).toBe(antes.fichaDb.quantidade);
    });

    it("itens duplicados retornam 400", async () => {
        await put(ficha.fichaId, [
            {
                cor_id: fixtures.corId,
                grade_versao_item_id: fixtures.gradeVersaoItemId,
                quantidade: 1,
            },
            {
                cor_id: fixtures.corId,
                grade_versao_item_id: fixtures.gradeVersaoItemId,
                quantidade: 2,
            },
        ]).expect(400);

        const depois = await snapshot();
        expect(depois.itens).toHaveLength(2);
    });

    it("matriz vazia retorna 400 (@ArrayMinSize(1) do DTO)", async () => {
        await put(ficha.fichaId, []).expect(400);

        const depois = await snapshot();
        expect(depois.itens).toHaveLength(2);
    });

    // ---------- 404 ----------

    it("ficha inexistente retorna 404", async () => {
        await put(2147483647, novaMatriz).expect(404);
    });
});
