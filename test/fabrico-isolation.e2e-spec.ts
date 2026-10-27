import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import * as bcrypt from "bcrypt";
import { Cargo, PrismaClient, UnidadeDeMedida } from "@prisma/client";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

type TenantFixtures = Awaited<ReturnType<typeof createTenantFixtures>>;

const runId = `e2e_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const password = "senha-e2e-123";

function auth(token: string) {
    return { Authorization: `Bearer ${token}` };
}

function ids(records: { id: number }[]) {
    return records.map((record) => record.id);
}

async function login(app: INestApplication<App>, email: string) {
    const response = await request(app.getHttpServer())
        .post("/usuarios/login")
        .send({ email, senha: password })
        .expect(201);

    return response.body.accessToken as string;
}

async function createTenantFixtures(prisma: PrismaClient, label: "a" | "b") {
    const fabrico = await prisma.fabrico.create({
        data: {
            nome_fantasia: `${runId}-fabrico-${label}`,
            razao_social: `${runId}-razao-${label}`,
            cnpj: `${label === "a" ? "10" : "20"}${Date.now().toString().slice(-12)}`,
        },
    });
    const user = await prisma.usuario.create({
        data: {
            email: `${runId}-${label}@filo.test`,
            nome: `${runId}-usuario-${label}`,
            senha: await bcrypt.hash(password, 10),
            cargo: Cargo.PROPRIETARIO,
            fabrico_id: fabrico.id,
        },
    });
    const tipoProduto = await prisma.tipoProduto.create({
        data: { nome: `${runId}-tipo-${label}`, fabrico_id: fabrico.id },
    });
    const tecido = await prisma.tecido.create({
        data: {
            nome: `${runId}-tecido-${label}`,
            custo_unitario: 10,
            unidade_de_medida: UnidadeDeMedida.METRO,
            fabrico_id: fabrico.id,
        },
    });
    const aviamento = await prisma.aviamento.create({
        data: {
            nome: `${runId}-aviamento-${label}`,
            custo_unitario: 1.5,
            unidade_de_medida: UnidadeDeMedida.UNIDADE,
            fabrico_id: fabrico.id,
        },
    });
    const cliente = await prisma.cliente.create({
        data: {
            nome: `${runId}-cliente-${label}`,
            status: true,
            fabrico_id: fabrico.id,
        },
    });
    const parceiro = await prisma.parceiro.create({
        data: {
            nome: `${runId}-parceiro-${label}`,
            fabrico_id: fabrico.id,
        },
    });
    const etapa = await prisma.etapa.create({
        data: {
            nome: `${runId}-etapa-${label}`,
            ordem: 1,
            ativa: true,
            fabrico_id: fabrico.id,
        },
    });
    const produto = await prisma.produto.create({
        data: {
            nome: `${runId}-produto-${label}`,
            tipo_produto_id: tipoProduto.id,
            tecido_id: tecido.id,
            fabrico_id: fabrico.id,
            grade_versao_id: sharedIds.gradeVersaoId,
        },
    });
    const pedido = await prisma.pedido.create({
        data: {
            finalizado: false,
            cor: "#FFFFFF",
            quantidade: 5,
            cliente_id: cliente.id,
            fabrico_id: fabrico.id,
        },
    });
    const ficha = await prisma.fichaTecnica.create({
        data: {
            concluida: false,
            quantidade: 5,
            produto_id: produto.id,
            grade_versao_id: sharedIds.gradeVersaoId,
            etapa_atual_id: etapa.id,
            pedido_id: pedido.id,
            fabrico_id: fabrico.id,
        },
    });

    return {
        fabrico,
        user,
        tipoProduto,
        tecido,
        aviamento,
        cliente,
        parceiro,
        etapa,
        produto,
        pedido,
        ficha,
    };
}

const sharedIds = {
    tamanhoId: 0,
    gradeId: 0,
    gradeVersaoId: 0,
    gradeExclusivaBId: 0,
    gradeVersaoExclusivaBId: 0,
};

describe("Isolamento E2E entre fabricos", () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let tenantA: TenantFixtures;
    let tenantB: TenantFixtures;
    let tokenA: string;
    let tokenB: string;
    let tokenAdmin: string;
    const adminEmail = `${runId}-admin@filo.test`;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        prisma = app.get(PrismaService);

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
        await prisma.gradeVersaoItem.create({
            data: { grade_versao_id: gradeVersao.id, tamanho_id: tamanho.id, posicao: 1 },
        });
        sharedIds.tamanhoId = tamanho.id;
        sharedIds.gradeId = grade.id;
        sharedIds.gradeVersaoId = gradeVersao.id;

        const gradeExclusivaB = await prisma.grade.create({
            data: { nome: `${runId}-grade-exclusiva-b`, ativo: true },
        });
        const gradeVersaoExclusivaB = await prisma.gradeVersao.create({
            data: { grade_id: gradeExclusivaB.id, versao: 1, ativo: true },
        });
        sharedIds.gradeExclusivaBId = gradeExclusivaB.id;
        sharedIds.gradeVersaoExclusivaBId = gradeVersaoExclusivaB.id;

        tenantA = await createTenantFixtures(prisma, "a");
        tenantB = await createTenantFixtures(prisma, "b");
        await prisma.fabricoGrade.createMany({
            data: [
                { fabrico_id: tenantA.fabrico.id, grade_id: grade.id, ativo: true },
                { fabrico_id: tenantB.fabrico.id, grade_id: grade.id, ativo: true },
                { fabrico_id: tenantB.fabrico.id, grade_id: gradeExclusivaB.id, ativo: true },
            ],
        });
        await prisma.usuario.create({
            data: {
                email: adminEmail,
                nome: `${runId}-admin`,
                senha: await bcrypt.hash(password, 10),
                cargo: Cargo.ADMIN,
                fabrico_id: null,
            },
        });
        tokenA = await login(app, tenantA.user.email);
        tokenB = await login(app, tenantB.user.email);
        tokenAdmin = await login(app, adminEmail);
    });

    afterAll(async () => {
        if (!prisma) {
            if (app) await app.close();
            return;
        }

        const fabricoIds = [tenantA?.fabrico.id, tenantB?.fabrico.id].filter(Boolean);

        await prisma.produtoAviamento.deleteMany({
            where: { produto: { fabrico_id: { in: fabricoIds } } },
        });
        await prisma.fichaParceiro.deleteMany({
            where: { ficha: { fabrico_id: { in: fabricoIds } } },
        });
        await prisma.fichaTecnicaItem.deleteMany({
            where: { ficha_tecnica: { fabrico_id: { in: fabricoIds } } },
        });
        await prisma.fichaEtapa.deleteMany({
            where: { ficha_tecnica: { fabrico_id: { in: fabricoIds } } },
        });
        await prisma.fichaTecnica.deleteMany({ where: { fabrico_id: { in: fabricoIds } } });
        await prisma.clienteProduto.deleteMany({
            where: { cliente: { fabrico_id: { in: fabricoIds } } },
        });
        await prisma.parceiroProduto.deleteMany({
            where: { parceiro: { fabrico_id: { in: fabricoIds } } },
        });
        await prisma.pedido.deleteMany({ where: { fabrico_id: { in: fabricoIds } } });
        await prisma.produto.deleteMany({ where: { fabrico_id: { in: fabricoIds } } });
        await prisma.parceiro.deleteMany({ where: { fabrico_id: { in: fabricoIds } } });
        await prisma.cliente.deleteMany({ where: { fabrico_id: { in: fabricoIds } } });
        await prisma.tecido.deleteMany({ where: { fabrico_id: { in: fabricoIds } } });
        await prisma.aviamento.deleteMany({ where: { fabrico_id: { in: fabricoIds } } });
        await prisma.etapa.deleteMany({ where: { fabrico_id: { in: fabricoIds } } });
        await prisma.tipoProduto.deleteMany({ where: { fabrico_id: { in: fabricoIds } } });
        await prisma.usuario.deleteMany({ where: { fabrico_id: { in: fabricoIds } } });
        await prisma.usuario.deleteMany({ where: { email: adminEmail } });
        await prisma.fabricoGrade.deleteMany({ where: { fabrico_id: { in: fabricoIds } } });
        await prisma.fabrico.deleteMany({ where: { id: { in: fabricoIds } } });
        await prisma.gradeVersaoItem.deleteMany({
            where: { grade_versao_id: sharedIds.gradeVersaoId },
        });
        await prisma.gradeItem.deleteMany({ where: { grade_id: sharedIds.gradeId } });
        await prisma.gradeVersao.deleteMany({
            where: { grade_id: { in: [sharedIds.gradeId, sharedIds.gradeExclusivaBId] } },
        });
        await prisma.grade.deleteMany({
            where: { id: { in: [sharedIds.gradeId, sharedIds.gradeExclusivaBId] } },
        });
        await prisma.tamanho.deleteMany({ where: { id: sharedIds.tamanhoId } });

        if (app) await app.close();
    });

    it("lista apenas registros do fabrico autenticado, mesmo com path/query falsificados", async () => {
        const matrix = [
            { path: "/clientes", own: tenantA.cliente.id, other: tenantB.cliente.id },
            { path: "/pedidos", own: tenantA.pedido.id, other: tenantB.pedido.id },
            { path: "/produtos", own: tenantA.produto.id, other: tenantB.produto.id },
            { path: "/produtos/fabrico", own: tenantA.produto.id, other: tenantB.produto.id },
            { path: "/tecidos", own: tenantA.tecido.id, other: tenantB.tecido.id },
            {
                path: `/tecidos/fabrico/${tenantA.fabrico.id}`,
                own: tenantA.tecido.id,
                other: tenantB.tecido.id,
            },
            { path: "/aviamentos", own: tenantA.aviamento.id, other: tenantB.aviamento.id },
            {
                path: `/aviamentos/fabrico/${tenantA.fabrico.id}`,
                own: tenantA.aviamento.id,
                other: tenantB.aviamento.id,
            },
            { path: "/parceiros", own: tenantA.parceiro.id, other: tenantB.parceiro.id },
            { path: "/etapas", own: tenantA.etapa.id, other: tenantB.etapa.id },
            {
                path: `/etapas/fabrico/${tenantA.fabrico.id}`,
                own: tenantA.etapa.id,
                other: tenantB.etapa.id,
            },
            { path: "/fichas-tecnicas", own: tenantA.ficha.id, other: tenantB.ficha.id },
        ];

        for (const item of matrix) {
            const response = await request(app.getHttpServer())
                .get(item.path)
                .set(auth(tokenA))
                .expect(200);

            expect(ids(response.body)).toContain(item.own);
            expect(ids(response.body)).not.toContain(item.other);
        }

        const forgedPaths = [
            `/clientes/fabrico/${tenantB.fabrico.id}`,
            `/pedidos/fabrico/${tenantB.fabrico.id}`,
            `/produtos/fabrico/${tenantB.fabrico.id}`,
            `/tecidos/fabrico/${tenantB.fabrico.id}`,
            `/aviamentos/fabrico/${tenantB.fabrico.id}`,
            `/parceiros/fabrico/${tenantB.fabrico.id}`,
            `/etapas/fabrico/${tenantB.fabrico.id}`,
            `/fichas-tecnicas/fabrico/${tenantB.fabrico.id}`,
        ];

        for (const path of forgedPaths) {
            const response = await request(app.getHttpServer()).get(path).set(auth(tokenA));

            expect([400, 403, 404]).toContain(response.status);
        }

        const users = await request(app.getHttpServer())
            .get(`/usuarios/fabrico?fabrico_id=${tenantB.fabrico.id}`)
            .set(auth(tokenA))
            .expect(200);

        expect(ids(users.body)).toContain(tenantA.user.id);
        expect(ids(users.body)).not.toContain(tenantB.user.id);
    });

    it("retorna 404 ao detalhar registros de outro fabrico", async () => {
        const matrix = [
            `/clientes/${tenantB.cliente.id}`,
            `/pedidos/${tenantB.pedido.id}`,
            `/produtos/${tenantB.produto.id}`,
            `/tecidos/${tenantB.tecido.id}`,
            `/aviamentos/${tenantB.aviamento.id}`,
            `/parceiros/${tenantB.parceiro.id}`,
            `/etapas/${tenantB.etapa.id}`,
            `/fichas-tecnicas/${tenantB.ficha.id}`,
        ];

        for (const path of matrix) {
            await request(app.getHttpServer()).get(path).set(auth(tokenA)).expect(404);
        }
    });

    it("bloqueia update/delete cruzados e preserva os dados do outro fabrico", async () => {
        const originalClienteB = await prisma.cliente.findUniqueOrThrow({
            where: { id: tenantB.cliente.id },
        });

        await request(app.getHttpServer())
            .put(`/clientes/${tenantB.cliente.id}`)
            .set(auth(tokenA))
            .send({ nome: `${runId}-invasao`, status: false, fabrico_id: tenantA.fabrico.id })
            .expect(404);
        await request(app.getHttpServer())
            .delete(`/clientes/${tenantB.cliente.id}`)
            .set(auth(tokenA))
            .expect(404);

        const clienteB = await prisma.cliente.findUniqueOrThrow({
            where: { id: tenantB.cliente.id },
        });
        expect(clienteB.nome).toBe(originalClienteB.nome);
        expect(clienteB.status).toBe(originalClienteB.status);

        const updateMatrix = [
            { path: `/pedidos/${tenantB.pedido.id}`, body: { finalizado: true } },
            { path: `/produtos/${tenantB.produto.id}`, body: { nome: `${runId}-produto-invasao` } },
            { path: `/tecidos/${tenantB.tecido.id}`, body: { nome: `${runId}-tecido-invasao` } },
            {
                path: `/aviamentos/${tenantB.aviamento.id}`,
                body: { nome: `${runId}-aviamento-invasao` },
            },
            {
                path: `/parceiros/${tenantB.parceiro.id}`,
                body: { nome: `${runId}-parceiro-invasao` },
            },
            { path: `/etapas/${tenantB.etapa.id}`, body: { nome: `${runId}-etapa-invasao` } },
            { path: `/fichas-tecnicas/${tenantB.ficha.id}`, body: { observacoes: "invasao" } },
        ];

        for (const item of updateMatrix) {
            await request(app.getHttpServer())
                .put(item.path)
                .set(auth(tokenA))
                .send(item.body)
                .expect(404);
            await request(app.getHttpServer()).delete(item.path).set(auth(tokenA)).expect(404);
        }

        await expect(
            prisma.pedido.findUniqueOrThrow({ where: { id: tenantB.pedido.id } }),
        ).resolves.toBeTruthy();
        await expect(
            prisma.produto.findUniqueOrThrow({ where: { id: tenantB.produto.id } }),
        ).resolves.toBeTruthy();
        await expect(
            prisma.tecido.findUniqueOrThrow({ where: { id: tenantB.tecido.id } }),
        ).resolves.toBeTruthy();
        await expect(
            prisma.aviamento.findUniqueOrThrow({ where: { id: tenantB.aviamento.id } }),
        ).resolves.toBeTruthy();
        await expect(
            prisma.parceiro.findUniqueOrThrow({ where: { id: tenantB.parceiro.id } }),
        ).resolves.toBeTruthy();
        await expect(
            prisma.etapa.findUniqueOrThrow({ where: { id: tenantB.etapa.id } }),
        ).resolves.toBeTruthy();
        await expect(
            prisma.fichaTecnica.findUniqueOrThrow({ where: { id: tenantB.ficha.id } }),
        ).resolves.toBeTruthy();
    });

    it("rejeita criações e associações com IDs relacionados de outro fabrico", async () => {
        await request(app.getHttpServer())
            .post("/pedidos")
            .set(auth(tokenA))
            .send({ finalizado: false, cliente_id: tenantB.cliente.id, quantidade: 1 })
            .expect(404);

        await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send({
                nome: `${runId}-produto-cross-tipo`,
                tipo_produto_id: tenantB.tipoProduto.id,
                fabrico_id: tenantA.fabrico.id,
            })
            .expect(400);

        await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send({
                nome: `${runId}-produto-cross-tecido`,
                tipo_produto_id: tenantA.tipoProduto.id,
                tecido_id: tenantB.tecido.id,
                fabrico_id: tenantA.fabrico.id,
            })
            .expect(400);

        // A ficha só nasce junto do pedido (POST /pedidos/completo): a recusa de relações de
        // outro fabrico vale para o produto, a etapa e o cliente informados.
        const pedidosAntes = await prisma.pedido.count({
            where: { fabrico_id: tenantA.fabrico.id },
        });
        const fichasAntes = await prisma.fichaTecnica.count({
            where: { fabrico_id: tenantA.fabrico.id },
        });
        const pedidoCompleto = (chave: string, corpo: object) =>
            request(app.getHttpServer())
                .post("/pedidos/completo")
                .set({ ...auth(tokenA), "Idempotency-Key": `${runId}-${chave}` })
                .send(corpo);

        await pedidoCompleto("produto-de-b", {
            fichas: [{ produto_id: tenantB.produto.id, quantidade: 0 }],
        }).expect(404);
        await pedidoCompleto("etapa-de-b", {
            fichas: [
                {
                    produto_id: tenantA.produto.id,
                    quantidade: 0,
                    etapa_atual_id: tenantB.etapa.id,
                },
            ],
        }).expect(400);
        await pedidoCompleto("cliente-de-b", {
            cliente_id: tenantB.cliente.id,
            fichas: [{ produto_id: tenantA.produto.id, quantidade: 0 }],
        }).expect(404);

        await expect(
            prisma.pedido.count({ where: { fabrico_id: tenantA.fabrico.id } }),
        ).resolves.toBe(pedidosAntes);
        await expect(
            prisma.fichaTecnica.count({ where: { fabrico_id: tenantA.fabrico.id } }),
        ).resolves.toBe(fichasAntes);

        await request(app.getHttpServer())
            .post("/produto-aviamento")
            .set(auth(tokenA))
            .send({
                produto_id: tenantA.produto.id,
                aviamento_id: tenantB.aviamento.id,
                quantidade: 1,
            })
            .expect(404);

        await request(app.getHttpServer())
            .post(`/clientes-produtos/${tenantA.cliente.id}/${tenantB.produto.id}`)
            .set(auth(tokenA))
            .send({ nome_para_cliente: "Cross", preco_padrao: 10 })
            .expect(404);

        await request(app.getHttpServer())
            .post(`/parceiros-produtos/${tenantA.parceiro.id}/${tenantB.produto.id}`)
            .set(auth(tokenA))
            .send({ preco: 10 })
            .expect(404);
    });

    it("valida tipo, tecido e grade do produto contra o fabrico autenticado na criação e na edição", async () => {
        const idInexistente = 2147483647;
        const baseA = {
            tipo_produto_id: tenantA.tipoProduto.id,
            tecido_id: tenantA.tecido.id,
            grade_versao_id: sharedIds.gradeVersaoId,
        };

        const gradeNaoLiberada = await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send({
                ...baseA,
                nome: `${runId}-produto-grade-b`,
                grade_versao_id: sharedIds.gradeVersaoExclusivaBId,
            })
            .expect(400);
        const gradeInexistente = await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send({ ...baseA, nome: `${runId}-produto-grade-x`, grade_versao_id: idInexistente })
            .expect(400);
        expect(gradeNaoLiberada.body).toEqual(gradeInexistente.body);

        const tipoDeB = await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send({
                ...baseA,
                nome: `${runId}-produto-tipo-b`,
                tipo_produto_id: tenantB.tipoProduto.id,
            })
            .expect(400);
        const tipoInexistente = await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send({ ...baseA, nome: `${runId}-produto-tipo-x`, tipo_produto_id: idInexistente })
            .expect(400);
        expect(tipoDeB.body).toEqual(tipoInexistente.body);

        const tecidoDeB = await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send({ ...baseA, nome: `${runId}-produto-tecido-b`, tecido_id: tenantB.tecido.id })
            .expect(400);
        const tecidoInexistente = await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send({ ...baseA, nome: `${runId}-produto-tecido-x`, tecido_id: idInexistente })
            .expect(400);
        expect(tecidoDeB.body).toEqual(tecidoInexistente.body);

        await expect(
            prisma.produto.count({
                where: {
                    nome: {
                        in: ["grade-b", "grade-x", "tipo-b", "tipo-x", "tecido-b", "tecido-x"].map(
                            (sufixo) => `${runId}-produto-${sufixo}`,
                        ),
                    },
                },
            }),
        ).resolves.toBe(0);

        const legitimo = await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send({ ...baseA, nome: `${runId}-produto-relacoes-validas` })
            .expect(201);
        const semOpcionais = await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send({
                nome: `${runId}-produto-sem-opcionais`,
                tipo_produto_id: baseA.tipo_produto_id,
            })
            .expect(201);
        expect(semOpcionais.body).toMatchObject({ tecido_id: null, grade_versao_id: null });

        const tentativasUpdate = [
            { tipo_produto_id: tenantB.tipoProduto.id },
            { tipo_produto_id: idInexistente },
            { tipo_produto_id: null },
            { tecido_id: tenantB.tecido.id },
            { tecido_id: idInexistente },
            { grade_versao_id: sharedIds.gradeVersaoExclusivaBId },
            { grade_versao_id: idInexistente },
        ];
        for (const body of tentativasUpdate) {
            await request(app.getHttpServer())
                .put(`/produtos/${legitimo.body.id}`)
                .set(auth(tokenA))
                .send(body)
                .expect(400);
        }

        await expect(
            prisma.produto.findUniqueOrThrow({ where: { id: legitimo.body.id } }),
        ).resolves.toMatchObject({ ...baseA, fabrico_id: tenantA.fabrico.id });

        await request(app.getHttpServer())
            .put(`/produtos/${legitimo.body.id}`)
            .set(auth(tokenA))
            .send({ tecido_id: null, grade_versao_id: null })
            .expect(200);
        await expect(
            prisma.produto.findUniqueOrThrow({ where: { id: legitimo.body.id } }),
        ).resolves.toMatchObject({ tecido_id: null, grade_versao_id: null });

        await request(app.getHttpServer())
            .put(`/produtos/${legitimo.body.id}`)
            .set(auth(tokenA))
            .send(baseA)
            .expect(200);
        await expect(
            prisma.produto.findUniqueOrThrow({ where: { id: legitimo.body.id } }),
        ).resolves.toMatchObject(baseA);

        await request(app.getHttpServer())
            .put(`/produtos/${tenantB.produto.id}`)
            .set(auth(tokenB))
            .send({ grade_versao_id: sharedIds.gradeVersaoExclusivaBId })
            .expect(200);
    });

    it("ignora ou rejeita fabrico_id falsificado no body e mantém fluxos válidos do próprio fabrico", async () => {
        const createdClienteName = `${runId}-cliente-body-fake`;
        await request(app.getHttpServer())
            .post("/clientes")
            .set(auth(tokenA))
            .send({ nome: createdClienteName, status: true, fabrico_id: tenantB.fabrico.id })
            .expect(201);

        const clientesA = await request(app.getHttpServer())
            .get("/clientes")
            .set(auth(tokenA))
            .expect(200);
        const clientesB = await request(app.getHttpServer())
            .get("/clientes")
            .set(auth(tokenB))
            .expect(200);
        expect(
            clientesA.body.some((cliente: { nome: string }) => cliente.nome === createdClienteName),
        ).toBe(true);
        expect(
            clientesB.body.some((cliente: { nome: string }) => cliente.nome === createdClienteName),
        ).toBe(false);

        const tecidoPayload = {
            nome: `${runId}-tecido-body-fake`,
            custo_unitario: 20,
            unidade_de_medida: UnidadeDeMedida.METRO,
        };
        await request(app.getHttpServer())
            .post("/tecidos")
            .set(auth(tokenA))
            .send({ ...tecidoPayload, fabrico_id: tenantB.fabrico.id })
            .expect(400);
        const tecido = await request(app.getHttpServer())
            .post("/tecidos")
            .set(auth(tokenA))
            .send(tecidoPayload)
            .expect(201);
        expect(tecido.body.fabrico_id).toBe(tenantA.fabrico.id);

        const aviamentoPayload = {
            nome: `${runId}-aviamento-body-fake`,
            custo_unitario: 2,
            unidade_de_medida: UnidadeDeMedida.UNIDADE,
        };
        await request(app.getHttpServer())
            .post("/aviamentos")
            .set(auth(tokenA))
            .send({ ...aviamentoPayload, fabrico_id: tenantB.fabrico.id })
            .expect(400);
        const aviamento = await request(app.getHttpServer())
            .post("/aviamentos")
            .set(auth(tokenA))
            .send(aviamentoPayload)
            .expect(201);
        expect(aviamento.body.fabrico_id).toBe(tenantA.fabrico.id);

        await request(app.getHttpServer())
            .post("/parceiros")
            .set(auth(tokenA))
            .send({ nome: `${runId}-parceiro-body-fake`, fabrico_id: tenantB.fabrico.id })
            .expect(201);

        const produtoPayload = {
            nome: `${runId}-produto-body-fake`,
            tipo_produto_id: tenantA.tipoProduto.id,
            tecido_id: tecido.body.id,
            grade_versao_id: sharedIds.gradeVersaoId,
        };
        await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send({ ...produtoPayload, fabrico_id: tenantB.fabrico.id })
            .expect(400);
        const produto = await request(app.getHttpServer())
            .post("/produtos")
            .set(auth(tokenA))
            .send(produtoPayload)
            .expect(201);
        expect(produto.body.fabrico_id).toBe(tenantA.fabrico.id);

        const pedido = await request(app.getHttpServer())
            .post("/pedidos")
            .set(auth(tokenA))
            .send({
                finalizado: false,
                cliente_id: tenantA.cliente.id,
                quantidade: 3,
                fabrico_id: tenantB.fabrico.id,
            })
            .expect(201);
        expect(pedido.body.fabrico_id).toBe(tenantA.fabrico.id);

        const pedidoCompleto = await request(app.getHttpServer())
            .post("/pedidos/completo")
            .set({ ...auth(tokenA), "Idempotency-Key": `${runId}-fabrico-falso` })
            .send({
                fabrico_id: tenantB.fabrico.id,
                fichas: [
                    {
                        produto_id: produto.body.id,
                        etapa_atual_id: tenantA.etapa.id,
                        quantidade: 0,
                        fabrico_id: tenantB.fabrico.id,
                    },
                ],
            })
            .expect(201);
        expect(pedidoCompleto.body.fabrico_id).toBe(tenantA.fabrico.id);
        expect(pedidoCompleto.body.fichas_tecnicas).toHaveLength(1);
        expect(pedidoCompleto.body.fichas_tecnicas[0].fabrico_id).toBe(tenantA.fabrico.id);

        await request(app.getHttpServer())
            .put(`/produtos/${produto.body.id}`)
            .set(auth(tokenA))
            .send({ nome: `${runId}-produto-valid-update`, fabrico_id: tenantB.fabrico.id })
            .expect(200);

        const updatedProduto = await prisma.produto.findUniqueOrThrow({
            where: { id: produto.body.id },
        });
        expect(updatedProduto.fabrico_id).toBe(tenantA.fabrico.id);
        expect(updatedProduto.nome).toBe(`${runId}-produto-valid-update`);

        await request(app.getHttpServer())
            .put(`/clientes/${tenantA.cliente.id}`)
            .set(auth(tokenA))
            .send({
                nome: `${runId}-cliente-valid-update`,
                status: true,
                fabrico_id: tenantB.fabrico.id,
            })
            .expect(200);
        const updatesComFabricoValidado = [
            { path: `/tecidos/${tenantA.tecido.id}`, nome: `${runId}-tecido-valid-update` },
            {
                path: `/aviamentos/${tenantA.aviamento.id}`,
                nome: `${runId}-aviamento-valid-update`,
            },
            { path: `/etapas/${tenantA.etapa.id}`, nome: `${runId}-etapa-valid-update` },
        ];
        for (const item of updatesComFabricoValidado) {
            await request(app.getHttpServer())
                .put(item.path)
                .set(auth(tokenA))
                .send({ nome: item.nome, fabrico_id: tenantB.fabrico.id })
                .expect(400);
            await request(app.getHttpServer())
                .put(item.path)
                .set(auth(tokenA))
                .send({ nome: item.nome })
                .expect(200);
        }
        await request(app.getHttpServer())
            .put(`/parceiros/${tenantA.parceiro.id}`)
            .set(auth(tokenA))
            .send({ nome: `${runId}-parceiro-valid-update`, fabrico_id: tenantB.fabrico.id })
            .expect(200);
        await request(app.getHttpServer())
            .put(`/pedidos/${tenantA.pedido.id}`)
            .set(auth(tokenA))
            .send({ finalizado: false, fabrico_id: tenantB.fabrico.id })
            .expect(200);
        await request(app.getHttpServer())
            .put(`/fichas-tecnicas/${tenantA.ficha.id}`)
            .set(auth(tokenA))
            .send({ observacoes: "update valido", fabrico_id: tenantB.fabrico.id })
            .expect(200);

        await expect(
            prisma.cliente.findUniqueOrThrow({ where: { id: tenantA.cliente.id } }),
        ).resolves.toMatchObject({ fabrico_id: tenantA.fabrico.id });
        await expect(
            prisma.tecido.findUniqueOrThrow({ where: { id: tenantA.tecido.id } }),
        ).resolves.toMatchObject({ fabrico_id: tenantA.fabrico.id });
        await expect(
            prisma.aviamento.findUniqueOrThrow({ where: { id: tenantA.aviamento.id } }),
        ).resolves.toMatchObject({ fabrico_id: tenantA.fabrico.id });
        await expect(
            prisma.parceiro.findUniqueOrThrow({ where: { id: tenantA.parceiro.id } }),
        ).resolves.toMatchObject({ fabrico_id: tenantA.fabrico.id });
        await expect(
            prisma.etapa.findUniqueOrThrow({ where: { id: tenantA.etapa.id } }),
        ).resolves.toMatchObject({ fabrico_id: tenantA.fabrico.id });
        await expect(
            prisma.pedido.findUniqueOrThrow({ where: { id: tenantA.pedido.id } }),
        ).resolves.toMatchObject({ fabrico_id: tenantA.fabrico.id });
        await expect(
            prisma.fichaTecnica.findUniqueOrThrow({ where: { id: tenantA.ficha.id } }),
        ).resolves.toMatchObject({ fabrico_id: tenantA.fabrico.id });
    });

    it("permite alterar apenas ativo no vínculo fabrico-grade e preserva grade e fabrico originais", async () => {
        const vinculoA = await prisma.fabricoGrade.findUniqueOrThrow({
            where: {
                fabrico_id_grade_id: {
                    fabrico_id: tenantA.fabrico.id,
                    grade_id: sharedIds.gradeId,
                },
            },
        });
        const vinculoOriginal = {
            fabrico_id: tenantA.fabrico.id,
            grade_id: sharedIds.gradeId,
            ativo: true,
        };

        const tentativasInvalidas = [
            { ativo: true, grade_id: sharedIds.gradeExclusivaBId },
            { ativo: true, grade_id: sharedIds.gradeId },
            { ativo: true, fabrico_id: tenantB.fabrico.id },
            { ativo: true, fabrico_id: tenantA.fabrico.id },
            {},
        ];
        for (const body of tentativasInvalidas) {
            await request(app.getHttpServer())
                .put(`/fabrico-grades/${vinculoA.id}`)
                .set(auth(tokenAdmin))
                .send(body)
                .expect(400);
        }

        await request(app.getHttpServer())
            .put(`/fabrico-grades/${vinculoA.id}`)
            .set(auth(tokenA))
            .send({ ativo: false })
            .expect(403);

        await expect(
            prisma.fabricoGrade.findUniqueOrThrow({ where: { id: vinculoA.id } }),
        ).resolves.toMatchObject(vinculoOriginal);

        await request(app.getHttpServer())
            .put(`/fabrico-grades/${vinculoA.id}`)
            .set(auth(tokenAdmin))
            .send({ ativo: false })
            .expect(200);
        await expect(
            prisma.fabricoGrade.findUniqueOrThrow({ where: { id: vinculoA.id } }),
        ).resolves.toMatchObject({ ...vinculoOriginal, ativo: false });

        await request(app.getHttpServer())
            .put(`/fabrico-grades/${vinculoA.id}`)
            .set(auth(tokenAdmin))
            .send({ ativo: true })
            .expect(200);
        await expect(
            prisma.fabricoGrade.findUniqueOrThrow({ where: { id: vinculoA.id } }),
        ).resolves.toMatchObject(vinculoOriginal);
    });

    it("vincula o parceiro apenas a etapas do próprio fabrico", async () => {
        const nomeInvasor = `${runId}-parceiro-etapa-de-b`;

        const criacao = await request(app.getHttpServer())
            .post("/parceiros")
            .set(auth(tokenA))
            .send({ nome: nomeInvasor, etapa_id: tenantB.etapa.id })
            .expect(400);
        const inexistente = await request(app.getHttpServer())
            .post("/parceiros")
            .set(auth(tokenA))
            .send({ nome: nomeInvasor, etapa_id: 2147483647 })
            .expect(400);
        expect(criacao.body.message).toBe(inexistente.body.message);
        await expect(
            prisma.parceiro.findFirst({
                where: { fabrico_id: tenantA.fabrico.id, nome: nomeInvasor },
            }),
        ).resolves.toBeNull();

        await request(app.getHttpServer())
            .put(`/parceiros/${tenantA.parceiro.id}`)
            .set(auth(tokenA))
            .send({ etapa_id: tenantB.etapa.id })
            .expect(400);
        await expect(
            prisma.parceiro.findUniqueOrThrow({ where: { id: tenantA.parceiro.id } }),
        ).resolves.toMatchObject({ etapa_id: null });

        await request(app.getHttpServer())
            .put(`/parceiros/${tenantA.parceiro.id}`)
            .set(auth(tokenA))
            .send({ etapa_id: tenantA.etapa.id })
            .expect(200);
        await expect(
            prisma.parceiro.findUniqueOrThrow({ where: { id: tenantA.parceiro.id } }),
        ).resolves.toMatchObject({ etapa_id: tenantA.etapa.id });

        const daEtapaA = await request(app.getHttpServer())
            .get(`/parceiros/etapa/${tenantA.etapa.id}`)
            .set(auth(tokenA))
            .expect(200);
        expect(daEtapaA.body.map((parceiro: { id: number }) => parceiro.id)).toEqual([
            tenantA.parceiro.id,
        ]);
        const etapaA = await prisma.etapa.findUniqueOrThrow({ where: { id: tenantA.etapa.id } });
        expect(daEtapaA.body[0].etapa).toMatchObject({ id: etapaA.id, nome: etapaA.nome });

        const daEtapaB = await request(app.getHttpServer())
            .get(`/parceiros/etapa/${tenantB.etapa.id}`)
            .set(auth(tokenA))
            .expect(200);
        expect(daEtapaB.body).toEqual([]);

        await request(app.getHttpServer())
            .put(`/parceiros/${tenantA.parceiro.id}`)
            .set(auth(tokenA))
            .send({ etapa_id: null })
            .expect(200);
        await expect(
            prisma.parceiro.findUniqueOrThrow({ where: { id: tenantA.parceiro.id } }),
        ).resolves.toMatchObject({ etapa_id: null });
    });
});
