import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ConcluirFichasCronService } from "../src/cronjobs/concluir-fichas-cron";
import {
    cleanupConcurrencyFixtures,
    createConcurrencyFixtures,
    createPedidoFicha,
    Fixtures,
    password,
    runId,
} from "./concurrency-fixtures";

jest.setTimeout(30000);

const HORA = 60 * 60 * 1000;

function auth(token: string) {
    return { Authorization: `Bearer ${token}` };
}

describe("Última etapa e ficha sem etapa (E2E com PostgreSQL)", () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let cron: ConcluirFichasCronService;
    let fixtures: Fixtures;
    let token: string;
    let fabricoBId: number;
    let etapasB: Array<{ id: number; ordem: number }>;
    let produtoBId: number;

    const ids = () => fixtures.etapas.map((etapa) => etapa.id);

    const produzidaEm = async (fichaId: number) =>
        (
            await prisma.fichaTecnica.findUniqueOrThrow({
                where: { id: fichaId },
                select: { produzida_em: true },
            })
        ).produzida_em;

    async function fichaAberta(etapaId: number, carimbo?: Date) {
        const { fichaId } = await createPedidoFicha(prisma, fixtures, etapaId, carimbo);
        return fichaId;
    }

    // Ficha criada quando a fábrica não tinha etapa ativa: sem etapa atual e sem histórico.
    async function fichaSemEtapa() {
        const { fichaId } = await createPedidoFicha(prisma, fixtures, fixtures.etapas[0].id);
        await prisma.fichaEtapa.deleteMany({ where: { ficha_tecnica_id: fichaId } });
        await prisma.fichaTecnica.update({
            where: { id: fichaId },
            data: { etapa_atual_id: null },
        });
        return fichaId;
    }

    const transferir = (body: Record<string, unknown>, bearer = token) =>
        request(app.getHttpServer())
            .post("/fichas-tecnicas/transferir-etapa")
            .set(auth(bearer))
            .send(body);

    async function resetar() {
        await prisma.fichaEtapa.deleteMany({
            where: { ficha_tecnica: { fabrico_id: fixtures.fabricoId } },
        });
        await prisma.fichaTecnica.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
        await prisma.pedido.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
        await prisma.etapa.deleteMany({
            where: { fabrico_id: fixtures.fabricoId, id: { notIn: ids() } },
        });
        // O índice único é parcial (ordem entre etapas ativas): desativa antes de reordenar.
        await prisma.etapa.updateMany({
            where: { id: { in: ids() } },
            data: { ativa: false },
        });
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
        cron = app.get(ConcluirFichasCronService);
        fixtures = await createConcurrencyFixtures(prisma);

        const login = await request(app.getHttpServer())
            .post("/usuarios/login")
            .send({ email: fixtures.email, senha: password })
            .expect(201);
        token = login.body.accessToken as string;

        // Outra fábrica, para provar que nada vaza de A para B.
        const fabricoB = await prisma.fabrico.create({
            data: {
                nome_fantasia: `${runId}-fabrico-b`,
                razao_social: `${runId}-razao-b`,
                cnpj: `${Date.now()}9`.slice(0, 14),
            },
        });
        fabricoBId = fabricoB.id;
        const tipoB = await prisma.tipoProduto.create({
            data: { nome: `${runId}-tipo-b`, fabrico_id: fabricoBId },
        });
        const produtoB = await prisma.produto.create({
            data: {
                nome: `${runId}-produto-b`,
                tipo_produto_id: tipoB.id,
                fabrico_id: fabricoBId,
                grade_versao_id: fixtures.gradeVersaoId,
            },
        });
        produtoBId = produtoB.id;
        etapasB = await Promise.all(
            [1, 2].map((ordem) =>
                prisma.etapa.create({
                    data: {
                        nome: `${runId}-etapa-b-${ordem}`,
                        ordem,
                        ativa: true,
                        fabrico_id: fabricoBId,
                    },
                    select: { id: true, ordem: true },
                }),
            ),
        );
    });

    beforeEach(async () => {
        await resetar();
    });

    afterAll(async () => {
        try {
            if (prisma && fixtures) {
                await resetar();
                await prisma.fichaEtapa.deleteMany({
                    where: { ficha_tecnica: { fabrico_id: fabricoBId } },
                });
                await prisma.fichaTecnica.deleteMany({ where: { fabrico_id: fabricoBId } });
                await prisma.pedido.deleteMany({ where: { fabrico_id: fabricoBId } });
                await prisma.produto.deleteMany({ where: { fabrico_id: fabricoBId } });
                await prisma.tipoProduto.deleteMany({ where: { fabrico_id: fabricoBId } });
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

    async function fichaDeB(etapaId: number) {
        const pedido = await prisma.pedido.create({
            data: {
                finalizado: false,
                cor: "#FFFFFF",
                quantidade: 0,
                numero: Math.floor(Math.random() * 1_000_000),
                fabrico_id: fabricoBId,
            },
        });
        const ficha = await prisma.fichaTecnica.create({
            data: {
                concluida: false,
                quantidade: 0,
                numero: Math.floor(Math.random() * 1_000_000),
                produto_id: produtoBId,
                grade_versao_id: fixtures.gradeVersaoId,
                etapa_atual_id: etapaId,
                pedido_id: pedido.id,
                fabrico_id: fabricoBId,
            },
        });
        return ficha.id;
    }

    describe("DEV-476: a última etapa ativa muda", () => {
        it("etapa nova depois da última: a ficha já produzida continua produzida e o job a conclui pela data original", async () => {
            const antiga = new Date(Date.now() - 73 * HORA);
            const produzida = await fichaAberta(fixtures.etapas[2].id, antiga);
            const noMeio = await fichaAberta(fixtures.etapas[1].id);

            await request(app.getHttpServer())
                .post("/etapas")
                .set(auth(token))
                .send({ nome: `${runId}-etapa-4`, ordem: 4 })
                .expect(201);

            expect((await produzidaEm(produzida))?.getTime()).toBe(antiga.getTime());
            expect(await produzidaEm(noMeio)).toBeNull();

            await cron.handleConcluirFichasAntigas();

            const depois = await prisma.fichaTecnica.findUniqueOrThrow({
                where: { id: produzida },
            });
            expect(depois.concluida).toBe(true);
            expect(depois.etapa_atual_id).toBe(fixtures.etapas[2].id);
            const aindaAberta = await prisma.fichaTecnica.findUniqueOrThrow({
                where: { id: noMeio },
            });
            expect(aindaAberta.concluida).toBe(false);
        });

        it("a última etapa é desativada: as fichas da penúltima passam a ser produzidas, as já produzidas ficam como estão", async () => {
            const antiga = new Date(Date.now() - 2 * HORA);
            const naPenultima = await fichaAberta(fixtures.etapas[1].id);
            const naUltima = await fichaAberta(fixtures.etapas[2].id, antiga);
            const antes = Date.now();

            await request(app.getHttpServer())
                .put(`/etapas/${fixtures.etapas[2].id}`)
                .set(auth(token))
                .send({ ativa: false })
                .expect(200);

            const carimbo = await produzidaEm(naPenultima);
            expect(carimbo).not.toBeNull();
            expect(carimbo!.getTime()).toBeGreaterThanOrEqual(antes - 1000);
            expect((await produzidaEm(naUltima))?.getTime()).toBe(antiga.getTime());
        });

        it("etapa existente é movida para o fim: as fichas que estavam nela passam a ser produzidas", async () => {
            const naEtapa1 = await fichaAberta(fixtures.etapas[0].id);
            const naEtapa3 = await fichaAberta(fixtures.etapas[2].id);

            await request(app.getHttpServer())
                .put(`/etapas/${fixtures.etapas[0].id}`)
                .set(auth(token))
                .send({ ordem: 10 })
                .expect(200);

            expect(await produzidaEm(naEtapa1)).not.toBeNull();
            // A etapa 3 deixou de ser a última e a ficha dela nunca tinha sido carimbada: segue como está.
            expect(await produzidaEm(naEtapa3)).toBeNull();
        });

        it("reativar uma etapa final inativa a torna a última e carimba as fichas que já estavam nela", async () => {
            await prisma.etapa.update({
                where: { id: fixtures.etapas[2].id },
                data: { ativa: false },
            });
            const naEtapa3 = await fichaAberta(fixtures.etapas[2].id);
            expect(await produzidaEm(naEtapa3)).toBeNull();

            await request(app.getHttpServer())
                .put(`/etapas/${fixtures.etapas[2].id}`)
                .set(auth(token))
                .send({ ativa: true })
                .expect(200);

            expect(await produzidaEm(naEtapa3)).not.toBeNull();
        });

        it("excluir a etapa final (sem fichas) torna a anterior a última e carimba as fichas dela", async () => {
            const criada = await request(app.getHttpServer())
                .post("/etapas")
                .set(auth(token))
                .send({ nome: `${runId}-etapa-extra`, ordem: 4 })
                .expect(201);
            const naEtapa3 = await fichaAberta(fixtures.etapas[2].id);
            expect(await produzidaEm(naEtapa3)).toBeNull();

            await request(app.getHttpServer())
                .delete(`/etapas/${criada.body.id}`)
                .set(auth(token))
                .expect(200);

            expect(await produzidaEm(naEtapa3)).not.toBeNull();
        });

        it("ficha concluída nunca é carimbada", async () => {
            const aberta = await fichaAberta(fixtures.etapas[1].id);
            const concluida = await fichaAberta(fixtures.etapas[1].id);
            await prisma.fichaTecnica.update({
                where: { id: concluida },
                data: { concluida: true },
            });

            await request(app.getHttpServer())
                .put(`/etapas/${fixtures.etapas[2].id}`)
                .set(auth(token))
                .send({ ativa: false })
                .expect(200);

            expect(await produzidaEm(aberta)).not.toBeNull();
            expect(await produzidaEm(concluida)).toBeNull();
        });

        it("repetir a operação não regrava o carimbo", async () => {
            const naPenultima = await fichaAberta(fixtures.etapas[1].id);
            const desativar = () =>
                request(app.getHttpServer())
                    .put(`/etapas/${fixtures.etapas[2].id}`)
                    .set(auth(token))
                    .send({ ativa: false });

            await desativar().expect(200);
            const primeiro = await produzidaEm(naPenultima);
            expect(primeiro).not.toBeNull();

            await desativar().expect(200);
            await request(app.getHttpServer())
                .put(`/etapas/${fixtures.etapas[2].id}`)
                .set(auth(token))
                .send({ ativa: true })
                .expect(200);

            expect((await produzidaEm(naPenultima))?.getTime()).toBe(primeiro?.getTime());
        });

        it("mudança de etapa em A não carimba ficha de B e A não altera etapa de B", async () => {
            const fichaB = await fichaDeB(etapasB[1].id);
            await fichaAberta(fixtures.etapas[1].id);

            await request(app.getHttpServer())
                .put(`/etapas/${fixtures.etapas[2].id}`)
                .set(auth(token))
                .send({ ativa: false })
                .expect(200);
            expect(await produzidaEm(fichaB)).toBeNull();

            const cruzado = await request(app.getHttpServer())
                .put(`/etapas/${etapasB[1].id}`)
                .set(auth(token))
                .send({ ativa: false });
            expect(cruzado.status).toBe(404);
            expect(
                (await prisma.etapa.findUniqueOrThrow({ where: { id: etapasB[1].id } })).ativa,
            ).toBe(true);
            expect(await produzidaEm(fichaB)).toBeNull();
        });
    });

    describe("DEV-478: transferir ficha sem etapa atual", () => {
        it("origem nula abre o primeiro histórico na etapa de destino", async () => {
            const ficha = await fichaSemEtapa();

            const resposta = await transferir({
                ficha_tecnica_id: ficha,
                etapa_origem_id: null,
                etapa_destino_id: fixtures.etapas[1].id,
            });

            expect(resposta.status).toBe(201);
            const estado = await prisma.fichaTecnica.findUniqueOrThrow({
                where: { id: ficha },
                include: { fichas_etapas: true },
            });
            expect(estado.etapa_atual_id).toBe(fixtures.etapas[1].id);
            expect(estado.fichas_etapas).toHaveLength(1);
            expect(estado.fichas_etapas[0].etapa_id).toBe(fixtures.etapas[1].id);
            expect(estado.fichas_etapas[0].data_fim).toBeNull();
            expect(estado.produzida_em).toBeNull();
        });

        it("indo direto para a última etapa ativa, marca produzida_em", async () => {
            const ficha = await fichaSemEtapa();

            await transferir({
                ficha_tecnica_id: ficha,
                etapa_origem_id: null,
                etapa_destino_id: fixtures.etapas[2].id,
            }).expect(201);

            expect(await produzidaEm(ficha)).not.toBeNull();
        });

        it("repetir a transferência não cria histórico novo nem falha", async () => {
            const ficha = await fichaSemEtapa();
            const corpo = {
                ficha_tecnica_id: ficha,
                etapa_origem_id: null,
                etapa_destino_id: fixtures.etapas[1].id,
            };

            await transferir(corpo).expect(201);
            await transferir(corpo).expect(201);

            expect(await prisma.fichaEtapa.count({ where: { ficha_tecnica_id: ficha } })).toBe(1);
        });

        it("duas transferências simultâneas para o mesmo destino resultam em um único histórico", async () => {
            const ficha = await fichaSemEtapa();
            const corpo = {
                ficha_tecnica_id: ficha,
                etapa_origem_id: null,
                etapa_destino_id: fixtures.etapas[1].id,
            };

            const respostas = await Promise.all([transferir(corpo), transferir(corpo)]);

            expect(respostas.map((r) => r.status)).toEqual([201, 201]);
            expect(await prisma.fichaEtapa.count({ where: { ficha_tecnica_id: ficha } })).toBe(1);
        });

        it("duas transferências simultâneas para destinos diferentes: uma vence, a outra é recusada e o histórico fica coerente", async () => {
            const ficha = await fichaSemEtapa();

            const respostas = await Promise.all(
                [fixtures.etapas[1].id, fixtures.etapas[2].id].map((destino) =>
                    transferir({
                        ficha_tecnica_id: ficha,
                        etapa_origem_id: null,
                        etapa_destino_id: destino,
                    }),
                ),
            );

            expect(respostas.map((r) => r.status).sort()).toEqual([201, 400]);
            const estado = await prisma.fichaTecnica.findUniqueOrThrow({
                where: { id: ficha },
                include: { fichas_etapas: true },
            });
            expect(estado.fichas_etapas).toHaveLength(1);
            expect(estado.fichas_etapas[0].etapa_id).toBe(estado.etapa_atual_id);
        });

        it("origem omitida continua inválida e nada é gravado", async () => {
            const ficha = await fichaSemEtapa();

            const resposta = await transferir({
                ficha_tecnica_id: ficha,
                etapa_destino_id: fixtures.etapas[1].id,
            });

            expect(resposta.status).toBe(400);
            expect(
                (await prisma.fichaTecnica.findUniqueOrThrow({ where: { id: ficha } }))
                    .etapa_atual_id,
            ).toBeNull();
            expect(await prisma.fichaEtapa.count({ where: { ficha_tecnica_id: ficha } })).toBe(0);
        });

        it("origem nula numa ficha que já tem etapa é recusada e preserva o histórico", async () => {
            const ficha = await fichaAberta(fixtures.etapas[0].id);

            const resposta = await transferir({
                ficha_tecnica_id: ficha,
                etapa_origem_id: null,
                etapa_destino_id: fixtures.etapas[1].id,
            });

            expect(resposta.status).toBe(400);
            const estado = await prisma.fichaTecnica.findUniqueOrThrow({
                where: { id: ficha },
                include: { fichas_etapas: true },
            });
            expect(estado.etapa_atual_id).toBe(fixtures.etapas[0].id);
            expect(estado.fichas_etapas).toHaveLength(1);
            expect(estado.fichas_etapas[0].data_fim).toBeNull();
        });

        it("etapa de destino de outra fábrica é recusada e a ficha continua sem etapa (A -> B)", async () => {
            const ficha = await fichaSemEtapa();

            const resposta = await transferir({
                ficha_tecnica_id: ficha,
                etapa_origem_id: null,
                etapa_destino_id: etapasB[0].id,
            });

            expect(resposta.status).toBe(400);
            expect(
                (await prisma.fichaTecnica.findUniqueOrThrow({ where: { id: ficha } }))
                    .etapa_atual_id,
            ).toBeNull();
            expect(await prisma.fichaEtapa.count({ where: { ficha_tecnica_id: ficha } })).toBe(0);
        });

        it("ficha sem etapa de outra fábrica não é acessível: 404, sem revelar que existe (A -> B)", async () => {
            const fichaB = await fichaDeB(etapasB[0].id);
            await prisma.fichaTecnica.update({
                where: { id: fichaB },
                data: { etapa_atual_id: null },
            });

            const resposta = await transferir({
                ficha_tecnica_id: fichaB,
                etapa_origem_id: null,
                etapa_destino_id: fixtures.etapas[1].id,
            });

            expect(resposta.status).toBe(404);
            expect(
                (await prisma.fichaTecnica.findUniqueOrThrow({ where: { id: fichaB } }))
                    .etapa_atual_id,
            ).toBeNull();
        });
    });
});
