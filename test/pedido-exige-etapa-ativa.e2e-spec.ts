import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import {
    cleanupConcurrencyFixtures,
    completePayload,
    createConcurrencyFixtures,
    Fixtures,
    password,
    runId,
} from "./concurrency-fixtures";

jest.setTimeout(30000);

const MENSAGEM = "Cadastre ao menos uma etapa ativa antes de criar fichas técnicas";

function auth(token: string) {
    return { Authorization: `Bearer ${token}` };
}

describe("Pedido exige etapa ativa na fábrica (E2E com PostgreSQL)", () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let fixtures: Fixtures;
    let token: string;
    let fabricoBId: number;
    let segundoProdutoId: number;

    const ids = () => fixtures.etapas.map((etapa) => etapa.id);

    const desativarTodas = () =>
        prisma.etapa.updateMany({
            where: { fabrico_id: fixtures.fabricoId },
            data: { ativa: false },
        });

    const contagem = async () => ({
        pedidos: await prisma.pedido.count({ where: { fabrico_id: fixtures.fabricoId } }),
        fichas: await prisma.fichaTecnica.count({ where: { fabrico_id: fixtures.fabricoId } }),
    });

    // Como o front: a etapa não é informada e o backend usa a primeira etapa ativa.
    const payloadSemEtapa = (chave: string) => {
        const base = completePayload(fixtures, chave);
        const { etapa_atual_id: _etapaInformada, ...ficha } = base.fichas[0];
        return { ...base, fichas: [ficha] };
    };

    const criarPedido = (chave: string, bearer = token) =>
        request(app.getHttpServer())
            .post("/pedidos/completo")
            .set(auth(bearer))
            .set("Idempotency-Key", chave)
            .send(payloadSemEtapa(chave));

    async function resetar() {
        await prisma.fichaEtapa.deleteMany({
            where: { ficha_tecnica: { fabrico_id: fixtures.fabricoId } },
        });
        await prisma.fichaTecnica.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
        await prisma.pedido.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
        await prisma.etapa.updateMany({ where: { id: { in: ids() } }, data: { ativa: false } });
        for (const etapa of fixtures.etapas) {
            await prisma.etapa.update({
                where: { id: etapa.id },
                data: { ordem: etapa.ordem, ativa: true },
            });
        }
    }

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        prisma = app.get(PrismaService);
        fixtures = await createConcurrencyFixtures(prisma);

        const login = await request(app.getHttpServer())
            .post("/usuarios/login")
            .send({ email: fixtures.email, senha: password })
            .expect(201);
        token = login.body.accessToken as string;

        const tipo = await prisma.tipoProduto.create({
            data: { nome: `${runId}-tipo-2`, fabrico_id: fixtures.fabricoId },
        });
        const segundoProduto = await prisma.produto.create({
            data: {
                nome: `${runId}-produto-2`,
                tipo_produto_id: tipo.id,
                fabrico_id: fixtures.fabricoId,
                grade_versao_id: fixtures.gradeVersaoId,
            },
        });
        segundoProdutoId = segundoProduto.id;

        // Outra fábrica COM etapa ativa: não pode valer para a fábrica A.
        const fabricoB = await prisma.fabrico.create({
            data: {
                nome_fantasia: `${runId}-fabrico-b`,
                razao_social: `${runId}-razao-b`,
                cnpj: `${Date.now()}8`.slice(0, 14),
            },
        });
        fabricoBId = fabricoB.id;
        await prisma.etapa.create({
            data: { nome: `${runId}-etapa-b`, ordem: 1, ativa: true, fabrico_id: fabricoBId },
        });
    });

    beforeEach(async () => {
        await resetar();
    });

    afterAll(async () => {
        try {
            if (prisma && fixtures) {
                await resetar();
                await prisma.etapa.deleteMany({ where: { fabrico_id: fabricoBId } });
                await prisma.fabrico.deleteMany({ where: { id: fabricoBId } });
                await cleanupConcurrencyFixtures(prisma, fixtures);
            }
        } finally {
            if (app) {
                await app.close();
            }
            if (prisma) {
                await prisma.$disconnect();
            }
        }
    });

    it("com etapa ativa o pedido é criado e a ficha entra na primeira etapa ativa", async () => {
        const resposta = await criarPedido(`${runId}-com-etapa`);

        expect(resposta.status).toBe(201);
        const ficha = await prisma.fichaTecnica.findFirstOrThrow({
            where: { pedido_id: resposta.body.id },
        });
        expect(ficha.etapa_atual_id).toBe(fixtures.etapas[0].id);
    });

    it("sem nenhuma etapa ativa o pedido é recusado com 400 e nada é gravado", async () => {
        await desativarTodas();

        const resposta = await criarPedido(`${runId}-sem-etapa`);

        expect(resposta.status).toBe(400);
        expect(JSON.stringify(resposta.body.message)).toContain(MENSAGEM);
        expect(await contagem()).toEqual({ pedidos: 0, fichas: 0 });
    });

    it("a mesma Idempotency-Key funciona depois que a fábrica ganha uma etapa ativa", async () => {
        await desativarTodas();
        const chave = `${runId}-retry`;

        await criarPedido(chave).expect(400);
        await prisma.etapa.update({ where: { id: fixtures.etapas[1].id }, data: { ativa: true } });
        const retry = await criarPedido(chave);

        expect(retry.status).toBe(201);
        expect(await contagem()).toEqual({ pedidos: 1, fichas: 1 });
        const ficha = await prisma.fichaTecnica.findFirstOrThrow({
            where: { pedido_id: retry.body.id },
        });
        expect(ficha.etapa_atual_id).toBe(fixtures.etapas[1].id);
    });

    it("etapa ativa de outra fábrica não vale para esta (A -> B)", async () => {
        await desativarTodas();
        expect(await prisma.etapa.count({ where: { fabrico_id: fabricoBId, ativa: true } })).toBe(
            1,
        );

        const resposta = await criarPedido(`${runId}-cruzado`);

        expect(resposta.status).toBe(400);
        expect(await contagem()).toEqual({ pedidos: 0, fichas: 0 });
    });

    it("etapa informada que está inativa mantém a mensagem própria", async () => {
        await prisma.etapa.update({ where: { id: fixtures.etapas[0].id }, data: { ativa: false } });
        const chave = `${runId}-informada-inativa`;
        const corpo = completePayload(fixtures, chave);
        corpo.fichas[0].etapa_atual_id = fixtures.etapas[0].id;

        const resposta = await request(app.getHttpServer())
            .post("/pedidos/completo")
            .set(auth(token))
            .set("Idempotency-Key", chave)
            .send(corpo);

        expect(resposta.status).toBe(400);
        expect(JSON.stringify(resposta.body.message)).toContain("estão inativas");
        expect(await contagem()).toEqual({ pedidos: 0, fichas: 0 });
    });

    describe("edição de pedido existente", () => {
        async function pedidoComUmaFicha() {
            const resposta = await criarPedido(`${runId}-edicao-${Date.now()}`).expect(201);
            const ficha = await prisma.fichaTecnica.findFirstOrThrow({
                where: { pedido_id: resposta.body.id },
            });
            return { pedidoId: resposta.body.id as number, fichaId: ficha.id };
        }

        it("adicionar ficha nova sem etapa ativa é recusado e o pedido fica intacto", async () => {
            const { pedidoId, fichaId } = await pedidoComUmaFicha();
            await desativarTodas();

            const resposta = await request(app.getHttpServer())
                .put(`/pedidos/completo/${pedidoId}`)
                .set(auth(token))
                .send({
                    observacoes: "não deve ser gravada",
                    fichas: [
                        { id: fichaId, produto_id: fixtures.produtoId, quantidade: 1 },
                        {
                            produto_id: segundoProdutoId,
                            grade_versao_id: fixtures.gradeVersaoId,
                            quantidade: 1,
                            cores_ids: [fixtures.corId],
                            itens: [
                                {
                                    cor_id: fixtures.corId,
                                    grade_versao_item_id: fixtures.gradeVersaoItemId,
                                    quantidade: 1,
                                },
                            ],
                        },
                    ],
                });

            expect(resposta.status).toBe(400);
            expect(JSON.stringify(resposta.body.message)).toContain(MENSAGEM);
            expect(await prisma.fichaTecnica.count({ where: { pedido_id: pedidoId } })).toBe(1);
            expect(
                (await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId } })).observacoes,
            ).not.toBe("não deve ser gravada");
        });

        it("editar um pedido que já existe sem criar ficha nova continua permitido", async () => {
            const { pedidoId, fichaId } = await pedidoComUmaFicha();
            await desativarTodas();

            const resposta = await request(app.getHttpServer())
                .put(`/pedidos/completo/${pedidoId}`)
                .set(auth(token))
                .send({
                    observacoes: "editado sem etapa ativa",
                    fichas: [{ id: fichaId, produto_id: fixtures.produtoId, quantidade: 1 }],
                });

            expect(resposta.status).toBe(200);
            expect(
                (await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId } })).observacoes,
            ).toBe("editado sem etapa ativa");
        });
    });
});
