import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import * as bcrypt from "bcrypt";
import { Cargo } from "@prisma/client";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

const runId = `e2e_ped_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const password = "senha-e2e-123";

describe("Pedido com fichas concluídas (E2E)", () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let token: string;
    const ids = {
        fabrico: 0,
        tamanho: 0,
        grade: 0,
        gradeVersao: 0,
        pedido: 0,
        fichaConcluida: 0,
        fichaPendente: 0,
        produtoConcluido: 0,
        produtoPendente: 0,
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();
        prisma = app.get(PrismaService);

        const fabrico = await prisma.fabrico.create({
            data: {
                nome_fantasia: `${runId}-fabrico`,
                razao_social: `${runId}-razao`,
                cnpj: `30${Date.now().toString().slice(-12)}`,
            },
        });
        ids.fabrico = fabrico.id;

        const usuario = await prisma.usuario.create({
            data: {
                email: `${runId}@filo.test`,
                nome: `${runId}-usuario`,
                senha: await bcrypt.hash(password, 10),
                cargo: Cargo.PROPRIETARIO,
                fabrico_id: fabrico.id,
            },
        });

        const tamanho = await prisma.tamanho.create({
            data: { codigo: `${runId}-M`, ordem_global: Math.floor(Math.random() * 1000000) },
        });
        const grade = await prisma.grade.create({ data: { nome: `${runId}-grade`, ativo: true } });
        const gradeVersao = await prisma.gradeVersao.create({
            data: { grade_id: grade.id, versao: 1, ativo: true },
        });
        ids.tamanho = tamanho.id;
        ids.grade = grade.id;
        ids.gradeVersao = gradeVersao.id;

        const tipo = await prisma.tipoProduto.create({
            data: { nome: `${runId}-tipo`, fabrico_id: fabrico.id },
        });
        const [produtoConcluido, produtoPendente] = await Promise.all(
            ["concluido", "pendente"].map((sufixo) =>
                prisma.produto.create({
                    data: {
                        nome: `${runId}-produto-${sufixo}`,
                        tipo_produto_id: tipo.id,
                        fabrico_id: fabrico.id,
                        grade_versao_id: gradeVersao.id,
                    },
                }),
            ),
        );
        ids.produtoConcluido = produtoConcluido.id;
        ids.produtoPendente = produtoPendente.id;

        const etapa = await prisma.etapa.create({
            data: { nome: `${runId}-etapa`, ordem: 1, ativa: true, fabrico_id: fabrico.id },
        });

        const pedido = await prisma.pedido.create({
            data: {
                finalizado: false,
                cor: "#FFFFFF",
                quantidade: 0,
                numero: 1,
                fabrico_id: fabrico.id,
            },
        });
        ids.pedido = pedido.id;

        const fichaBase = {
            quantidade: 0,
            grade_versao_id: gradeVersao.id,
            etapa_atual_id: etapa.id,
            pedido_id: pedido.id,
            fabrico_id: fabrico.id,
        };
        const fichaConcluida = await prisma.fichaTecnica.create({
            data: {
                ...fichaBase,
                produto_id: produtoConcluido.id,
                numero: 1,
                concluida: true,
                produzida_em: new Date(Date.now() - 80 * 60 * 60 * 1000),
            },
        });
        const fichaPendente = await prisma.fichaTecnica.create({
            data: { ...fichaBase, produto_id: produtoPendente.id, numero: 2, concluida: false },
        });
        ids.fichaConcluida = fichaConcluida.id;
        ids.fichaPendente = fichaPendente.id;

        await prisma.fichaEtapa.create({
            data: {
                ficha_tecnica_id: fichaConcluida.id,
                etapa_id: etapa.id,
                data_inicio: new Date(Date.now() - 90 * 60 * 60 * 1000),
                data_fim: new Date(Date.now() - 8 * 60 * 60 * 1000),
            },
        });

        const login = await request(app.getHttpServer())
            .post("/usuarios/login")
            .send({ email: usuario.email, senha: password })
            .expect(201);
        token = login.body.accessToken as string;
    });

    afterAll(async () => {
        if (prisma && ids.fabrico) {
            await prisma.fichaEtapa.deleteMany({
                where: { ficha_tecnica: { fabrico_id: ids.fabrico } },
            });
            await prisma.fichaTecnica.deleteMany({ where: { fabrico_id: ids.fabrico } });
            await prisma.pedido.deleteMany({ where: { fabrico_id: ids.fabrico } });
            await prisma.produto.deleteMany({ where: { fabrico_id: ids.fabrico } });
            await prisma.tipoProduto.deleteMany({ where: { fabrico_id: ids.fabrico } });
            await prisma.etapa.deleteMany({ where: { fabrico_id: ids.fabrico } });
            await prisma.usuario.deleteMany({ where: { fabrico_id: ids.fabrico } });
            await prisma.fabrico.deleteMany({ where: { id: ids.fabrico } });
            await prisma.gradeVersao.deleteMany({ where: { grade_id: ids.grade } });
            await prisma.grade.deleteMany({ where: { id: ids.grade } });
            await prisma.tamanho.deleteMany({ where: { id: ids.tamanho } });
        }

        if (app) await app.close();
    });

    it("GET /pedidos/:id devolve as fichas concluídas e pendentes", async () => {
        const response = await request(app.getHttpServer())
            .get(`/pedidos/${ids.pedido}`)
            .set({ Authorization: `Bearer ${token}` })
            .expect(200);

        const fichaIds = response.body.fichas_tecnicas.map((ficha: { id: number }) => ficha.id);
        expect(fichaIds).toEqual(expect.arrayContaining([ids.fichaConcluida, ids.fichaPendente]));
    });

    it("PUT /pedidos/completo/:id sem a ficha concluída responde 409 e não apaga nada", async () => {
        await request(app.getHttpServer())
            .put(`/pedidos/completo/${ids.pedido}`)
            .set({ Authorization: `Bearer ${token}` })
            .send({
                fichas: [{ id: ids.fichaPendente, produto_id: ids.produtoPendente, quantidade: 0 }],
            })
            .expect(409);

        await expect(
            prisma.fichaTecnica.findUnique({ where: { id: ids.fichaConcluida } }),
        ).resolves.toMatchObject({ concluida: true, pedido_id: ids.pedido });
        await expect(
            prisma.fichaEtapa.count({ where: { ficha_tecnica_id: ids.fichaConcluida } }),
        ).resolves.toBe(1);
    });

    it("PUT /pedidos/completo/:id com todas as fichas continua funcionando", async () => {
        await request(app.getHttpServer())
            .put(`/pedidos/completo/${ids.pedido}`)
            .set({ Authorization: `Bearer ${token}` })
            .send({
                observacoes: "editado no e2e",
                fichas: [
                    { id: ids.fichaConcluida, produto_id: ids.produtoConcluido, quantidade: 0 },
                    { id: ids.fichaPendente, produto_id: ids.produtoPendente, quantidade: 0 },
                ],
            })
            .expect(200);

        await expect(
            prisma.pedido.findUnique({ where: { id: ids.pedido } }),
        ).resolves.toMatchObject({ observacoes: "editado no e2e" });
        await expect(prisma.fichaTecnica.count({ where: { pedido_id: ids.pedido } })).resolves.toBe(
            2,
        );
    });
});
