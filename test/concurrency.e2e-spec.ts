import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { Prisma } from "@prisma/client";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ConcluirFichasCronService } from "../src/cronjobs/concluir-fichas-cron";
import {
    completePayload,
    cleanupConcurrencyFixtures,
    createConcurrencyFixtures,
    createPedidoFicha,
    Fixtures,
    password,
    runId,
} from "./concurrency-fixtures";

const pedidoLockCountQuery = Prisma.sql`
    SELECT COUNT(*)::int AS count
    FROM pg_stat_activity
    WHERE wait_event_type = 'Lock'
      AND query ILIKE '%pedidos%'
`;

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

function startTogether<T>(first: () => Promise<T>, second: () => Promise<T>) {
    const ready = deferred();
    let arrivals = 0;

    const start = async (operation: () => Promise<T>) => {
        arrivals += 1;
        if (arrivals === 2) {
            ready.resolve();
        }

        await ready.promise;
        return operation();
    };

    return Promise.all([start(first), start(second)]);
}

async function holdLock(prisma: PrismaService, query: Prisma.Sql) {
    const acquired = deferred();
    const released = deferred();
    const transaction = prisma.$transaction(
        async (tx) => {
            await tx.$executeRaw(query);
            acquired.resolve();
            await released.promise;
        },
        { maxWait: 15000, timeout: 60000 },
    );

    await acquired.promise;

    return { release: released.resolve, finished: transaction };
}

async function waitForBlocked(
    prisma: PrismaService,
    query: Prisma.Sql,
    expected: number,
    description: string,
) {
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
        const rows = await prisma.$queryRaw<Array<{ count: number }>>(query);

        if ((rows[0]?.count ?? 0) >= expected) {
            return;
        }

        await new Promise<void>((resolve) => setImmediate(resolve));
    }

    throw new Error(`Esperava ${expected} requests bloqueados em ${description}`);
}

jest.setTimeout(30000);

async function login(app: INestApplication<App>, email: string) {
    const response = await request(app.getHttpServer())
        .post("/usuarios/login")
        .send({ email, senha: password })
        .expect(201);

    return response.body.accessToken as string;
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
        fixtures = await createConcurrencyFixtures(prisma);
        token = await login(app, fixtures.email);
    });

    afterAll(async () => {
        try {
            if (prisma && fixtures) {
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

    it("gera numeros distintos para dois pedidos completos simultaneos", async () => {
        const lock = await holdLock(
            prisma,
            Prisma.sql`SELECT pg_advisory_xact_lock(1, ${fixtures.fabricoId})`,
        );

        try {
            const requests = startTogether(
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

            await waitForBlocked(
                prisma,
                Prisma.sql`
                    SELECT COUNT(*)::int AS count
                    FROM pg_locks
                    WHERE locktype = 'advisory'
                      AND granted = false
                      AND classid = 1
                      AND objid = ${fixtures.fabricoId}
                `,
                2,
                "lock de numeracao",
            );
            lock.release();
            const [first, second] = await requests;

            expect(first.status).toBe(201);
            expect(second.status).toBe(201);
            expect(first.body.numero).not.toBe(second.body.numero);

            await expect(
                prisma.pedido.count({
                    where: {
                        fabrico_id: fixtures.fabricoId,
                        idempotency_key: { in: [`${runId}-numero-a`, `${runId}-numero-b`] },
                    },
                }),
            ).resolves.toBe(2);
        } finally {
            lock.release();
            await lock.finished;
        }
    });

    it.each([true, false])("valida chave concorrente com conteúdo igual: %s", async (igual) => {
        const idempotencyKey = `${runId}-idempotente-${igual}`;
        const lock = await holdLock(
            prisma,
            Prisma.sql`SELECT pg_advisory_xact_lock(1, ${fixtures.fabricoId})`,
        );

        try {
            const requests = startTogether(
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
                        .send({
                            ...completePayload(fixtures, idempotencyKey),
                            ...(igual ? {} : { observacoes: "conteúdo diferente" }),
                        }),
            );

            await waitForBlocked(
                prisma,
                Prisma.sql`
                    SELECT COUNT(*)::int AS count
                    FROM pg_locks
                    WHERE locktype = 'advisory'
                      AND granted = false
                      AND classid = 1
                      AND objid = ${fixtures.fabricoId}
                `,
                2,
                "lock de numeracao",
            );
            lock.release();
            const [first, second] = await requests;

            expect([first.status, second.status].sort()).toEqual(igual ? [201, 201] : [201, 409]);
            const vencedor = first.status === 201 ? first : second;
            if (igual) expect(first.body.id).toBe(second.body.id);
            const persistido = await prisma.pedido.findUniqueOrThrow({
                where: { id: vencedor.body.id },
            });
            expect(persistido.idempotency_fingerprint).toMatch(/^[a-f0-9]{64}$/);
            expect(persistido.observacoes).toBe(vencedor.body.observacoes);
            const repeticao = await request(app.getHttpServer())
                .post("/pedidos/completo")
                .set(auth(token))
                .set("Idempotency-Key", idempotencyKey)
                .send({
                    ...completePayload(fixtures, idempotencyKey),
                    ...(persistido.observacoes ? { observacoes: persistido.observacoes } : {}),
                });
            expect(repeticao.status).toBe(201);
            expect(repeticao.body.id).toBe(vencedor.body.id);
            await expect(
                prisma.pedido.count({
                    where: { fabrico_id: fixtures.fabricoId, idempotency_key: idempotencyKey },
                }),
            ).resolves.toBe(1);
            await expect(
                prisma.fichaTecnica.count({ where: { pedido_id: vencedor.body.id } }),
            ).resolves.toBe(1);
        } finally {
            lock.release();
            await lock.finished;
        }
    });

    it("cron e edicao completa do pedido terminam consistentemente", async () => {
        const { pedidoId, fichaId } = await createPedidoFicha(
            prisma,
            fixtures,
            fixtures.etapas[2].id,
            new Date(Date.now() - 73 * 60 * 60 * 1000),
        );
        const lock = await holdLock(
            prisma,
            Prisma.sql`SELECT id FROM "pedidos" WHERE id = ${pedidoId} FOR UPDATE`,
        );

        try {
            const cronRequest = cron.handleConcluirFichasAntigas();
            await waitForBlocked(prisma, pedidoLockCountQuery, 1, "pedido");
            const updateRequest = request(app.getHttpServer())
                .put(`/pedidos/completo/${pedidoId}`)
                .set(auth(token))
                .send({
                    observacoes: "update concorrente",
                    fichas: [
                        {
                            id: fichaId,
                            produto_id: fixtures.produtoId,
                            quantidade: 0,
                        },
                    ],
                })
                .then((response) => response);
            await waitForBlocked(prisma, pedidoLockCountQuery, 2, "pedido");

            lock.release();
            const [, updateResult] = await Promise.all([cronRequest, updateRequest]);

            expect(updateResult.status).toBe(409);
            const estado = await prisma.pedido.findUniqueOrThrow({
                where: { id: pedidoId },
                include: { fichas_tecnicas: true },
            });
            expect(estado.finalizado).toBe(true);
            expect(estado.fichas_tecnicas.every((item) => item.concluida)).toBe(true);
        } finally {
            lock.release();
            await lock.finished;
        }
    });

    it("transferencia e update da ficha preservam a etapa e o historico", async () => {
        const { pedidoId, fichaId } = await createPedidoFicha(
            prisma,
            fixtures,
            fixtures.etapas[0].id,
        );
        const lock = await holdLock(
            prisma,
            Prisma.sql`SELECT id FROM "pedidos" WHERE id = ${pedidoId} FOR UPDATE`,
        );

        try {
            const transferRequest = request(app.getHttpServer())
                .post("/fichas-tecnicas/transferir-etapa")
                .set(auth(token))
                .send({
                    ficha_tecnica_id: fichaId,
                    etapa_origem_id: fixtures.etapas[0].id,
                    etapa_destino_id: fixtures.etapas[1].id,
                })
                .then((response) => response);
            await waitForBlocked(prisma, pedidoLockCountQuery, 1, "pedido");
            const updateRequest = request(app.getHttpServer())
                .put(`/fichas-tecnicas/${fichaId}`)
                .set(auth(token))
                .send({
                    observacoes: "update concorrente",
                })
                .then((response) => response);
            await waitForBlocked(prisma, pedidoLockCountQuery, 2, "pedido");

            lock.release();
            const [transferResult, updateResult] = await Promise.all([
                transferRequest,
                updateRequest,
            ]);

            expect(transferResult.status).toBe(201);
            expect(updateResult.status).toBe(200);

            const estado = await prisma.fichaTecnica.findUniqueOrThrow({
                where: { id: fichaId },
                include: { fichas_etapas: true },
            });
            expect(estado.etapa_atual_id).toBe(fixtures.etapas[1].id);
            expect(estado.fichas_etapas).toHaveLength(2);

            const etapasAbertas = estado.fichas_etapas.filter((etapa) => etapa.data_fim === null);
            expect(etapasAbertas).toHaveLength(1);
            expect(etapasAbertas[0].etapa_id).toBe(fixtures.etapas[1].id);

            const etapaOrigem = estado.fichas_etapas.find(
                (etapa) => etapa.etapa_id === fixtures.etapas[0].id,
            );
            expect(etapaOrigem).toBeDefined();
            expect(etapaOrigem?.data_fim).not.toBeNull();
            expect(estado.observacoes).toBe("update concorrente");
        } finally {
            lock.release();
            await lock.finished;
        }
    });
});
