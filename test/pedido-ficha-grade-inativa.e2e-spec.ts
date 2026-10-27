import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import {
    Fixtures,
    cleanupConcurrencyFixtures,
    createConcurrencyFixtures,
    createPedidoFicha,
    password,
    runId,
} from "./concurrency-fixtures";

type ItemMatriz = { cor_id: number; grade_versao_item_id: number; quantidade: number };

describe("Ficha com versão de grade inativa (E2E)", () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let fixtures: Fixtures;
    let token: string;

    // Dados extras além das fixtures: a versão 1 precisa de 2 tamanhos, e é preciso
    // uma versão 2 (a "nova versão publicada") e uma versão inativa qualquer.
    const extras = {
        tamanhoId: 0,
        v1Item2Id: 0,
        v2Id: 0,
        v2Item1Id: 0,
        v2Item2Id: 0,
        versaoInativaId: 0,
    };

    let ficha: { pedidoId: number; fichaId: number };
    let matrizV1: ItemMatriz[];

    const auth = () => ({ Authorization: `Bearer ${token}` });

    const putPedido = (body: string | object) =>
        request(app.getHttpServer())
            .put(`/pedidos/completo/${ficha.pedidoId}`)
            .set(auth())
            .send(body);

    const getFicha = () =>
        request(app.getHttpServer()).get(`/fichas-tecnicas/${ficha.fichaId}`).set(auth());

    const payloadFicha = (overrides: Record<string, unknown> = {}) => ({
        fichas: [
            {
                id: ficha.fichaId,
                produto_id: fixtures.produtoId,
                quantidade: 10,
                cores_ids: [fixtures.corId],
                itens: matrizV1,
                ...overrides,
            },
        ],
    });

    // Equivale ao ADMIN publicar uma versão nova (POST /grade-versoes/grade/:id):
    // a versão anterior fica inativa, a nova fica ativa e a ficha segue apontando para a antiga.
    const publicarNovaVersao = () =>
        prisma.$transaction([
            prisma.gradeVersao.update({
                where: { id: fixtures.gradeVersaoId },
                data: { ativo: false },
            }),
            prisma.gradeVersao.update({ where: { id: extras.v2Id }, data: { ativo: true } }),
        ]);

    // O banco guarda uma linha por cor x tamanho (inclusive com 0), então compara só o que tem quantidade.
    const quantidades = (
        itens: { cor_id: number; grade_versao_item_id: number; quantidade: number }[],
    ) =>
        Object.fromEntries(
            itens
                .filter((i) => i.quantidade > 0)
                .map((i) => [`${i.cor_id}-${i.grade_versao_item_id}`, i.quantidade]),
        );

    const snapshot = async () => {
        const [itens, fichaDb, produtoDb] = await Promise.all([
            prisma.fichaTecnicaItem.findMany({ where: { ficha_tecnica_id: ficha.fichaId } }),
            prisma.fichaTecnica.findUniqueOrThrow({ where: { id: ficha.fichaId } }),
            prisma.produto.findUniqueOrThrow({ where: { id: fixtures.produtoId } }),
        ]);
        return { itens, fichaDb, produtoDb };
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        prisma = app.get(PrismaService);
        fixtures = await createConcurrencyFixtures(prisma);

        // 2º tamanho na versão 1 (a fixture só cria um)
        const tamanho2 = await prisma.tamanho.create({
            data: { codigo: `${runId}-M`, ordem_global: Math.floor(Math.random() * 1000000) },
        });
        extras.tamanhoId = tamanho2.id;
        const v1Item2 = await prisma.gradeVersaoItem.create({
            data: {
                grade_versao_id: fixtures.gradeVersaoId,
                tamanho_id: tamanho2.id,
                posicao: 2,
            },
        });
        extras.v1Item2Id = v1Item2.id;

        // versão 2 da mesma grade (criada inativa; cada teste a "publica" quando precisa)
        const v2 = await prisma.gradeVersao.create({
            data: { grade_id: fixtures.gradeId, versao: 2, ativo: false },
        });
        extras.v2Id = v2.id;
        const v2Item1 = await prisma.gradeVersaoItem.create({
            data: { grade_versao_id: v2.id, tamanho_id: fixtures.tamanhoId, posicao: 1 },
        });
        const v2Item2 = await prisma.gradeVersaoItem.create({
            data: { grade_versao_id: v2.id, tamanho_id: tamanho2.id, posicao: 2 },
        });
        extras.v2Item1Id = v2Item1.id;
        extras.v2Item2Id = v2Item2.id;

        // uma versão inativa que NÃO é a gravada na ficha
        const inativa = await prisma.gradeVersao.create({
            data: { grade_id: fixtures.gradeId, versao: 3, ativo: false },
        });
        extras.versaoInativaId = inativa.id;

        const login = await request(app.getHttpServer())
            .post("/usuarios/login")
            .send({ email: fixtures.email, senha: password })
            .expect(201);
        token = login.body.accessToken as string;
    });

    beforeEach(async () => {
        // estado inicial: versão 1 ativa, versão 2 ainda não publicada, produto na versão 1
        await prisma.gradeVersao.update({
            where: { id: fixtures.gradeVersaoId },
            data: { ativo: true },
        });
        await prisma.gradeVersao.update({ where: { id: extras.v2Id }, data: { ativo: false } });
        await prisma.produto.update({
            where: { id: fixtures.produtoId },
            data: { grade_versao_id: fixtures.gradeVersaoId },
        });

        // ficha criada na versão 1 com matriz preenchida (total 10)
        ficha = await createPedidoFicha(prisma, fixtures, fixtures.etapas[0].id);
        matrizV1 = [
            {
                cor_id: fixtures.corId,
                grade_versao_item_id: fixtures.gradeVersaoItemId,
                quantidade: 4,
            },
            { cor_id: fixtures.corId, grade_versao_item_id: extras.v1Item2Id, quantidade: 6 },
        ];
        await prisma.fichaTecnicaItem.createMany({
            data: matrizV1.map((i) => ({ ficha_tecnica_id: ficha.fichaId, ...i })),
        });
        await prisma.fichaTecnica.update({
            where: { id: ficha.fichaId },
            data: { quantidade: 10 },
        });
        await prisma.pedido.update({ where: { id: ficha.pedidoId }, data: { quantidade: 10 } });
    });

    afterAll(async () => {
        if (prisma && fixtures) {
            await cleanupConcurrencyFixtures(prisma, fixtures);
            await prisma.tamanho.deleteMany({ where: { id: extras.tamanhoId } });
        }
        if (app) await app.close();
    });

    // ---------- back devolve a versão gravada mesmo inativa ----------

    it("GET da ficha devolve a versão gravada (inativa) com seus itens e tamanhos", async () => {
        await publicarNovaVersao();

        const res = await getFicha().expect(200);

        expect(res.body.grade_versao_id).toBe(fixtures.gradeVersaoId);
        expect(res.body.grade_versao.id).toBe(fixtures.gradeVersaoId);
        expect(res.body.grade_versao.ativo).toBe(false);
        expect(res.body.grade_versao.grade.id).toBe(fixtures.gradeId);
        expect(res.body.grade_versao.itens).toHaveLength(2);
        expect(
            res.body.grade_versao.itens.map(
                (i: { tamanho: { codigo: string } }) => i.tamanho.codigo,
            ),
        ).toEqual([`${runId}-P`, `${runId}-M`]);
        expect(quantidades(res.body.ficha_tecnica_itens)).toEqual(quantidades(matrizV1));
    });

    // ---------- reabrir e salvar sem trocar a grade ----------

    it("salvar enviando a versão já gravada (inativa) não troca a grade nem apaga a matriz", async () => {
        await publicarNovaVersao();

        await putPedido(payloadFicha({ grade_versao_id: fixtures.gradeVersaoId })).expect(200);

        const depois = await snapshot();
        expect(depois.fichaDb.grade_versao_id).toBe(fixtures.gradeVersaoId);
        expect(depois.fichaDb.quantidade).toBe(10);
        expect(quantidades(depois.itens)).toEqual(quantidades(matrizV1));
        // salvar sem trocar a grade não pode reapontar o produto para a versão nova
        expect(depois.produtoDb.grade_versao_id).toBe(fixtures.gradeVersaoId);
    });

    it("salvar sem informar grade_versao_id mantém a versão gravada e a matriz", async () => {
        await publicarNovaVersao();

        await putPedido(payloadFicha()).expect(200);

        const depois = await snapshot();
        expect(depois.fichaDb.grade_versao_id).toBe(fixtures.gradeVersaoId);
        expect(quantidades(depois.itens)).toEqual(quantidades(matrizV1));
    });

    // ---------- trocar de grade continua valendo as regras ----------

    it("rejeita trocar para uma versão inativa que não é a gravada, sem alterar nada", async () => {
        await publicarNovaVersao();
        const antes = await snapshot();

        const res = await putPedido(
            payloadFicha({ grade_versao_id: extras.versaoInativaId }),
        ).expect(400);

        expect(res.body.message).toBe("Versão de grade inválida ou inativa");

        const depois = await snapshot();
        expect(depois.fichaDb.grade_versao_id).toBe(antes.fichaDb.grade_versao_id);
        expect(quantidades(depois.itens)).toEqual(quantidades(antes.itens));
        expect(depois.produtoDb.grade_versao_id).toBe(antes.produtoDb.grade_versao_id);
    });

    it("troca de grade de propósito para a versão ativa continua funcionando", async () => {
        await publicarNovaVersao();
        const matrizV2: ItemMatriz[] = [
            { cor_id: fixtures.corId, grade_versao_item_id: extras.v2Item1Id, quantidade: 4 },
            { cor_id: fixtures.corId, grade_versao_item_id: extras.v2Item2Id, quantidade: 6 },
        ];

        await putPedido(payloadFicha({ grade_versao_id: extras.v2Id, itens: matrizV2 })).expect(
            200,
        );

        const depois = await snapshot();
        expect(depois.fichaDb.grade_versao_id).toBe(extras.v2Id);
        expect(depois.fichaDb.quantidade).toBe(10);
        expect(quantidades(depois.itens)).toEqual(quantidades(matrizV2));
        expect(depois.produtoDb.grade_versao_id).toBe(extras.v2Id);
    });

    it("troca de grade com itens da versão antiga falha e desfaz tudo (rollback)", async () => {
        await publicarNovaVersao();
        const antes = await snapshot();

        const res = await putPedido(payloadFicha({ grade_versao_id: extras.v2Id })).expect(400);

        expect(res.body.message).toBe(
            "Um ou mais itens de grade não pertencem à versão da ficha técnica",
        );

        const depois = await snapshot();
        expect(depois.fichaDb.grade_versao_id).toBe(fixtures.gradeVersaoId);
        expect(quantidades(depois.itens)).toEqual(quantidades(antes.itens));
        // o produto chegou a ser reapontado dentro da transação: o rollback precisa devolvê-lo
        expect(depois.produtoDb.grade_versao_id).toBe(fixtures.gradeVersaoId);
    });
});
