import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import * as bcrypt from "bcrypt";
import { Cargo, Prisma, TipoCor } from "@prisma/client";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ConcluirFichasCronService } from "../src/cronjobs/concluir-fichas-cron";

const runId = `e2e_concorrencia_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const password = "senha-e2e-123";

type Fixtures = {
    fabricoId: number;
    email: string;
    tamanhoId: number;
    gradeId: number;
    clienteId: number;
    produtoId: number;
    gradeVersaoId: number;
    gradeVersaoItemId: number;
    corId: number;
    parceiroId: number;
    etapas: [
        { id: number; ordem: number },
        { id: number; ordem: number },
        { id: number; ordem: number },
    ];
};

type PedidoFicha = {
    pedido: { id: number; numero: number | null };
    ficha: { id: number; numero: number };
};

function deferred() {
    let resolvePromise: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
    });

    return { promise, resolve: resolvePromise };
}

function auth(token: string) {
    return { Authorization: `Bearer ${token}` };
}

function launchPair<T>(first: () => PromiseLike<T>, second: () => PromiseLike<T>) {
    const ready = deferred();
    const started = deferred();
    let arrivals = 0;
    let invocations = 0;

    const launch = async (operation: () => PromiseLike<T>) => {
        arrivals += 1;
        if (arrivals === 2) {
            ready.resolve();
        }

        await ready.promise;
        const result = Promise.resolve(operation());
        invocations += 1;
        if (invocations === 2) {
            started.resolve();
        }

        return result;
    };

    return {
        started: started.promise,
        results: Promise.all([launch(first), launch(second)]),
    };
}

function launchFirstThenSecond<T>(first: () => PromiseLike<T>, second: () => PromiseLike<T>) {
    const secondStarted = deferred();
    const results = (async () => {
        const firstResult = Promise.resolve(first());
        await new Promise<void>((resolve) => setImmediate(resolve));
        const secondResult = Promise.resolve(second());
        secondStarted.resolve();

        return Promise.all([firstResult, secondResult]);
    })();

    return { started: secondStarted.promise, results };
}

async function holdAdvisoryLock(prisma: PrismaService, key: number) {
    const acquired = deferred();
    const released = deferred();
    const transaction = prisma.$transaction(
        async (tx) => {
            await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(1, ${key})`);
            acquired.resolve();
            await released.promise;
        },
        { maxWait: 15000, timeout: 60000 },
    );

    await acquired.promise;

    return {
        release: released.resolve,
        finished: transaction,
    };
}

async function holdPedidoLock(prisma: PrismaService, pedidoId: number) {
    const acquired = deferred();
    const released = deferred();
    const transaction = prisma.$transaction(
        async (tx) => {
            await tx.$queryRaw(
                Prisma.sql`SELECT id FROM "pedidos" WHERE id = ${pedidoId} FOR UPDATE`,
            );
            acquired.resolve();
            await released.promise;
        },
        { maxWait: 15000, timeout: 60000 },
    );

    await acquired.promise;

    return {
        release: released.resolve,
        finished: transaction,
    };
}

async function login(app: INestApplication<App>, email: string) {
    const response = await request(app.getHttpServer())
        .post("/usuarios/login")
        .send({ email, senha: password })
        .expect(201);

    return response.body.accessToken as string;
}

async function createFixtures(prisma: PrismaService): Promise<Fixtures> {
    const fabrico = await prisma.fabrico.create({
        data: {
            nome_fantasia: `${runId}-fabrico`,
            razao_social: `${runId}-razao`,
            cnpj: `${Date.now()}${Math.floor(Math.random() * 10)}`.slice(0, 14),
        },
    });
    const email = `${runId}@filo.test`;

    await prisma.usuario.create({
        data: {
            email,
            nome: `${runId}-usuario`,
            senha: await bcrypt.hash(password, 10),
            cargo: Cargo.PROPRIETARIO,
            fabrico_id: fabrico.id,
        },
    });

    const cliente = await prisma.cliente.create({
        data: {
            nome: `${runId}-cliente`,
            status: true,
            fabrico_id: fabrico.id,
        },
    });
    const tipoProduto = await prisma.tipoProduto.create({
        data: { nome: `${runId}-tipo`, fabrico_id: fabrico.id },
    });
    const tamanho = await prisma.tamanho.create({
        data: { codigo: `${runId}-P`, ordem_global: Math.floor(Math.random() * 1000000) },
    });
    const grade = await prisma.grade.create({
        data: { nome: `${runId}-grade`, ativo: true },
    });
    const gradeVersao = await prisma.gradeVersao.create({
        data: { grade_id: grade.id, versao: 1, ativo: true },
    });
    await prisma.gradeItem.create({
        data: { grade_id: grade.id, tamanho_id: tamanho.id, posicao: 1 },
    });
    const gradeVersaoItem = await prisma.gradeVersaoItem.create({
        data: { grade_versao_id: gradeVersao.id, tamanho_id: tamanho.id, posicao: 1 },
    });
    await prisma.fabricoGrade.create({
        data: { fabrico_id: fabrico.id, grade_id: grade.id, ativo: true },
    });

    const produto = await prisma.produto.create({
        data: {
            nome: `${runId}-produto`,
            tipo_produto_id: tipoProduto.id,
            fabrico_id: fabrico.id,
            grade_versao_id: gradeVersao.id,
        },
    });
    const cor = await prisma.cor.create({
        data: {
            nome: `${runId}-cor`,
            codigo_hex: "#FFFFFF",
            tipo: TipoCor.COR,
            fabrico_id: fabrico.id,
        },
    });
    const parceiro = await prisma.parceiro.create({
        data: {
            nome: `${runId}-parceiro`,
            categoria: `${runId}-categoria`,
            fabrico_id: fabrico.id,
        },
    });
    const etapas = await Promise.all(
        [1, 2, 3].map((ordem) =>
            prisma.etapa.create({
                data: {
                    nome: `${runId}-etapa-${ordem}`,
                    ordem,
                    ativa: true,
                    fabrico_id: fabrico.id,
                },
                select: { id: true, ordem: true },
            }),
        ),
    );

    return {
        fabricoId: fabrico.id,
        email,
        tamanhoId: tamanho.id,
        gradeId: grade.id,
        clienteId: cliente.id,
        produtoId: produto.id,
        gradeVersaoId: gradeVersao.id,
        gradeVersaoItemId: gradeVersaoItem.id,
        corId: cor.id,
        parceiroId: parceiro.id,
        etapas: etapas as Fixtures["etapas"],
    };
}

let nextPedidoNumber = 1000;
let nextFichaNumber = 1000;

async function createPedidoFicha(
    prisma: PrismaService,
    fixtures: Fixtures,
    options: { etapaId: number; produzidaEm?: Date },
): Promise<PedidoFicha> {
    const pedido = await prisma.pedido.create({
        data: {
            finalizado: false,
            cor: "#FFFFFF",
            quantidade: 0,
            numero: nextPedidoNumber++,
            cliente_id: fixtures.clienteId,
            fabrico_id: fixtures.fabricoId,
        },
    });
    const ficha = await prisma.fichaTecnica.create({
        data: {
            concluida: false,
            quantidade: 0,
            numero: nextFichaNumber++,
            produto_id: fixtures.produtoId,
            grade_versao_id: fixtures.gradeVersaoId,
            etapa_atual_id: options.etapaId,
            pedido_id: pedido.id,
            fabrico_id: fixtures.fabricoId,
            produzida_em: options.produzidaEm,
        },
    });
    await prisma.fichaEtapa.create({
        data: {
            ficha_tecnica_id: ficha.id,
            etapa_id: options.etapaId,
            data_inicio: new Date(Date.now() - 60 * 60 * 1000),
        },
    });

    return { pedido, ficha };
}

function completePayload(fixtures: Fixtures, idempotencyKey: string) {
    return {
        idempotency_key: idempotencyKey,
        fichas: [
            {
                produto_id: fixtures.produtoId,
                grade_versao_id: fixtures.gradeVersaoId,
                etapa_atual_id: fixtures.etapas[0].id,
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
    };
}

describe("Concorrencia E2E com PostgreSQL", () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let fixtures: Fixtures;
    let token: string;
    let cron: ConcluirFichasCronService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        prisma = app.get(PrismaService);
        cron = app.get(ConcluirFichasCronService);
        fixtures = await createFixtures(prisma);
        token = await login(app, fixtures.email);
    });

    afterAll(async () => {
        if (prisma && fixtures) {
            await prisma.fichaParceiro.deleteMany({
                where: { ficha: { fabrico_id: fixtures.fabricoId } },
            });
            await prisma.fichaTecnicaItem.deleteMany({
                where: { ficha_tecnica: { fabrico_id: fixtures.fabricoId } },
            });
            await prisma.fichaEtapa.deleteMany({
                where: { ficha_tecnica: { fabrico_id: fixtures.fabricoId } },
            });
            await prisma.fichaTecnica.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
            await prisma.clienteProduto.deleteMany({
                where: { cliente: { fabrico_id: fixtures.fabricoId } },
            });
            await prisma.parceiroProduto.deleteMany({
                where: { parceiro: { fabrico_id: fixtures.fabricoId } },
            });
            await prisma.pedido.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
            await prisma.produto.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
            await prisma.parceiro.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
            await prisma.cor.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
            await prisma.cliente.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
            await prisma.etapa.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
            await prisma.tipoProduto.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
            await prisma.usuario.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
            await prisma.fabricoGrade.deleteMany({ where: { fabrico_id: fixtures.fabricoId } });
            await prisma.fabrico.deleteMany({ where: { id: fixtures.fabricoId } });
            await prisma.gradeVersaoItem.deleteMany({
                where: { grade_versao_id: fixtures.gradeVersaoId },
            });
            await prisma.gradeItem.deleteMany({ where: { grade_id: fixtures.gradeId } });
            await prisma.gradeVersao.deleteMany({ where: { id: fixtures.gradeVersaoId } });
            await prisma.grade.deleteMany({ where: { id: fixtures.gradeId } });
            await prisma.tamanho.deleteMany({ where: { id: fixtures.tamanhoId } });
        }

        if (app) {
            await app.close();
        }
    });

    it("gera numeros distintos para dois pedidos completos simultaneos", async () => {
        const lock = await holdAdvisoryLock(prisma, fixtures.fabricoId);

        try {
            const pair = launchPair(
                () =>
                    request(app.getHttpServer())
                        .post("/pedidos/completo")
                        .set(auth(token))
                        .set("Idempotency-Key", `${runId}-numero-a`)
                        .send(completePayload(fixtures, `${runId}-numero-a`)),
                () =>
                    request(app.getHttpServer())
                        .post("/pedidos/completo")
                        .set(auth(token))
                        .set("Idempotency-Key", `${runId}-numero-b`)
                        .send(completePayload(fixtures, `${runId}-numero-b`)),
            );

            await pair.started;
            lock.release();
            const [first, second] = await pair.results;

            expect(first.status).toBe(201);
            expect(second.status).toBe(201);
            expect(first.body.numero).not.toBe(second.body.numero);

            const pedidos = await prisma.pedido.findMany({
                where: {
                    fabrico_id: fixtures.fabricoId,
                    idempotency_key: { in: [`${runId}-numero-a`, `${runId}-numero-b`] },
                },
                select: { numero: true },
                orderBy: { numero: "asc" },
            });
            expect(pedidos).toHaveLength(2);
            expect(pedidos[0].numero).not.toBe(pedidos[1].numero);
        } finally {
            lock.release();
            await lock.finished;
        }
    });

    it("retorna o mesmo pedido para a mesma chave de idempotencia concorrente", async () => {
        const idempotencyKey = `${runId}-idempotente`;
        const lock = await holdAdvisoryLock(prisma, fixtures.fabricoId);

        try {
            const pair = launchPair(
                () =>
                    request(app.getHttpServer())
                        .post("/pedidos/completo")
                        .set(auth(token))
                        .set("Idempotency-Key", idempotencyKey)
                        .send(completePayload(fixtures, idempotencyKey)),
                () =>
                    request(app.getHttpServer())
                        .post("/pedidos/completo")
                        .set(auth(token))
                        .set("Idempotency-Key", idempotencyKey)
                        .send(completePayload(fixtures, idempotencyKey)),
            );

            await pair.started;
            lock.release();
            const [first, second] = await pair.results;

            expect(first.status).toBe(201);
            expect(second.status).toBe(201);
            expect(first.body.id).toBe(second.body.id);

            await expect(
                prisma.pedido.count({
                    where: { fabrico_id: fixtures.fabricoId, idempotency_key: idempotencyKey },
                }),
            ).resolves.toBe(1);
            await expect(
                prisma.fichaTecnica.count({ where: { pedido_id: first.body.id } }),
            ).resolves.toBe(1);
        } finally {
            lock.release();
            await lock.finished;
        }
    });

    it("termina consistentemente quando o cron concorre com a edicao completa do pedido", async () => {
        const { pedido, ficha } = await createPedidoFicha(prisma, fixtures, {
            etapaId: fixtures.etapas[2].id,
            produzidaEm: new Date(Date.now() - 73 * 60 * 60 * 1000),
        });
        const lock = await holdPedidoLock(prisma, pedido.id);

        try {
            const pair = launchPair(
                () => cron.handleConcluirFichasAntigas().then(() => ({ status: 204 })),
                () =>
                    request(app.getHttpServer())
                        .put(`/pedidos/completo/${pedido.id}`)
                        .set(auth(token))
                        .send({
                            observacoes: "update concorrente",
                            fichas: [
                                {
                                    id: ficha.id,
                                    produto_id: fixtures.produtoId,
                                    quantidade: 0,
                                },
                            ],
                        })
                        .then((response) => ({
                            status: response.status,
                            body: response.body,
                        })),
            );

            await pair.started;
            lock.release();
            const [cronResult, updateResult] = await pair.results;

            expect([200, 201, 409]).toContain(updateResult.status);
            expect(cronResult.status).toBe(204);

            const estado = await prisma.pedido.findUniqueOrThrow({
                where: { id: pedido.id },
                include: { fichas_tecnicas: true },
            });
            expect(estado.finalizado).toBe(true);
            expect(estado.fichas_tecnicas.every((item) => item.concluida)).toBe(true);
            if (updateResult.status === 200) {
                expect(estado.observacoes).toBe("update concorrente");
            }
        } finally {
            lock.release();
            await lock.finished;
        }
    });

    it("nao confirma uma atualizacao obsoleta que sobrescreva uma transferencia", async () => {
        const { pedido, ficha } = await createPedidoFicha(prisma, fixtures, {
            etapaId: fixtures.etapas[0].id,
        });
        const lock = await holdPedidoLock(prisma, pedido.id);

        try {
            const pair = launchFirstThenSecond(
                () =>
                    request(app.getHttpServer())
                        .post("/fichas-tecnicas/transferir-etapa")
                        .set(auth(token))
                        .send({
                            ficha_tecnica_id: ficha.id,
                            etapa_origem_id: fixtures.etapas[0].id,
                            etapa_destino_id: fixtures.etapas[1].id,
                        }),
                () =>
                    request(app.getHttpServer())
                        .put(`/fichas-tecnicas/${ficha.id}`)
                        .set(auth(token))
                        .send({
                            etapa_atual_id: fixtures.etapas[2].id,
                            observacoes: "update concorrente",
                        }),
            );

            await pair.started;
            lock.release();
            const [transferResult, updateResult] = await pair.results;

            expect([200, 201, 400, 409]).toContain(transferResult.status);
            expect([200, 400, 409]).toContain(updateResult.status);
            expect(transferResult.status === 201 || updateResult.status === 200).toBe(true);
            expect(transferResult.status === 201 && updateResult.status === 200).toBe(false);

            const estado = await prisma.fichaTecnica.findUniqueOrThrow({
                where: { id: ficha.id },
            });
            expect(estado.etapa_atual_id).toBe(
                transferResult.status === 201 ? fixtures.etapas[1].id : fixtures.etapas[2].id,
            );
            if (updateResult.status === 200) {
                expect(estado.observacoes).toBe("update concorrente");
            }
        } finally {
            lock.release();
            await lock.finished;
        }
    });
});
