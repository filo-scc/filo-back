import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import * as bcrypt from "bcrypt";
import { Cargo, TipoCor } from "@prisma/client";
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

    describe("ficha concluída imutável (DEV-505) e etapa só pela transferência (DEV-506)", () => {
        const auth = () => ({ Authorization: `Bearer ${token}` });
        const lerFicha = (id: number) => prisma.fichaTecnica.findUniqueOrThrow({ where: { id } });
        const etapas = { inicial: 0, meio: 0, final: 0 };
        const comMatriz = { pedido: 0, ficha: 0 };

        beforeAll(async () => {
            // Pedido novo só aceita grade liberada para o fabrico (FabricoGrade).
            await prisma.fabricoGrade.create({
                data: { fabrico_id: ids.fabrico, grade_id: ids.grade, ativo: true },
            });
            const inicial = await prisma.etapa.findFirstOrThrow({
                where: { fabrico_id: ids.fabrico, ordem: 1 },
            });
            const [meio, final] = await Promise.all(
                [2, 3].map((ordem) =>
                    prisma.etapa.create({
                        data: {
                            nome: `${runId}-etapa-${ordem}`,
                            ordem,
                            ativa: true,
                            fabrico_id: ids.fabrico,
                        },
                    }),
                ),
            );
            etapas.inicial = inicial.id;
            etapas.meio = meio.id;
            etapas.final = final.id;

            // Concluída com uma célula na matriz: excluir a matriz deixa de ser um no-op.
            const [gradeVersaoItem, cor] = await Promise.all([
                prisma.gradeVersaoItem.create({
                    data: { grade_versao_id: ids.gradeVersao, tamanho_id: ids.tamanho, posicao: 1 },
                }),
                prisma.cor.create({
                    data: { nome: `${runId}-cor`, tipo: TipoCor.COR, fabrico_id: ids.fabrico },
                }),
            ]);
            const pedido = await prisma.pedido.create({
                data: {
                    finalizado: false,
                    cor: "#FFFFFF",
                    quantidade: 1,
                    numero: 2,
                    fabrico_id: ids.fabrico,
                },
            });
            const ficha = await prisma.fichaTecnica.create({
                data: {
                    quantidade: 1,
                    grade_versao_id: ids.gradeVersao,
                    etapa_atual_id: inicial.id,
                    pedido_id: pedido.id,
                    fabrico_id: ids.fabrico,
                    produto_id: ids.produtoConcluido,
                    numero: 3,
                    concluida: true,
                    produzida_em: new Date(Date.now() - 80 * 60 * 60 * 1000),
                },
            });
            await prisma.fichaTecnicaItem.create({
                data: {
                    ficha_tecnica_id: ficha.id,
                    cor_id: cor.id,
                    grade_versao_item_id: gradeVersaoItem.id,
                    quantidade: 1,
                },
            });
            comMatriz.pedido = pedido.id;
            comMatriz.ficha = ficha.id;
        });

        it("PUT /pedidos/completo/:id alterando a concluída responde 409 e não grava nada, nem na pendente", async () => {
            await request(app.getHttpServer())
                .put(`/pedidos/completo/${ids.pedido}`)
                .set(auth())
                .send({
                    fichas: [
                        {
                            id: ids.fichaConcluida,
                            produto_id: ids.produtoConcluido,
                            quantidade: 0,
                            observacoes: "tentativa de edição",
                        },
                        {
                            id: ids.fichaPendente,
                            produto_id: ids.produtoPendente,
                            quantidade: 0,
                            observacoes: "não deve ser gravada",
                        },
                    ],
                })
                .expect(409);

            await expect(lerFicha(ids.fichaConcluida)).resolves.toMatchObject({
                observacoes: null,
            });
            await expect(lerFicha(ids.fichaPendente)).resolves.toMatchObject({
                observacoes: null,
            });
        });

        it("PUT /pedidos/completo/:id alterando só a pendente passa e a concluída não é regravada", async () => {
            const concluidaAntes = await lerFicha(ids.fichaConcluida);

            await request(app.getHttpServer())
                .put(`/pedidos/completo/${ids.pedido}`)
                .set(auth())
                .send({
                    fichas: [
                        {
                            id: ids.fichaConcluida,
                            produto_id: ids.produtoConcluido,
                            quantidade: 0,
                        },
                        {
                            id: ids.fichaPendente,
                            produto_id: ids.produtoPendente,
                            quantidade: 0,
                            observacoes: "pendente editada",
                        },
                    ],
                })
                .expect(200);

            await expect(lerFicha(ids.fichaConcluida)).resolves.toEqual(concluidaAntes);
            await expect(lerFicha(ids.fichaPendente)).resolves.toMatchObject({
                observacoes: "pendente editada",
            });
        });

        it("ficha na última etapa (produzida_em) ainda não concluída continua editável", async () => {
            await prisma.fichaTecnica.update({
                where: { id: ids.fichaPendente },
                data: { produzida_em: new Date() },
            });

            await request(app.getHttpServer())
                .put(`/pedidos/completo/${ids.pedido}`)
                .set(auth())
                .send({
                    fichas: [
                        {
                            id: ids.fichaConcluida,
                            produto_id: ids.produtoConcluido,
                            quantidade: 0,
                        },
                        {
                            id: ids.fichaPendente,
                            produto_id: ids.produtoPendente,
                            quantidade: 0,
                            observacoes: "editada depois de produzida",
                        },
                    ],
                })
                .expect(200);

            await expect(lerFicha(ids.fichaPendente)).resolves.toMatchObject({
                observacoes: "editada depois de produzida",
            });
        });

        it("PUT /pedidos/completo/:id omitindo a ficha produzida e ainda não concluída responde 409 e não apaga nada", async () => {
            await request(app.getHttpServer())
                .put(`/pedidos/completo/${ids.pedido}`)
                .set(auth())
                .send({
                    fichas: [
                        {
                            id: ids.fichaConcluida,
                            produto_id: ids.produtoConcluido,
                            quantidade: 0,
                        },
                    ],
                })
                .expect(409);

            await expect(
                prisma.fichaTecnica.count({ where: { pedido_id: ids.pedido } }),
            ).resolves.toBe(2);
        });

        it("PUT /fichas-tecnicas/:id recusa a concluída com 409 e edita a pendente", async () => {
            await request(app.getHttpServer())
                .put(`/fichas-tecnicas/${ids.fichaConcluida}`)
                .set(auth())
                .send({ observacoes: "tentativa de edição" })
                .expect(409);
            await expect(lerFicha(ids.fichaConcluida)).resolves.toMatchObject({
                observacoes: null,
            });

            await request(app.getHttpServer())
                .put(`/fichas-tecnicas/${ids.fichaPendente}`)
                .set(auth())
                .send({ observacoes: "editada pela ficha" })
                .expect(200);
            await expect(lerFicha(ids.fichaPendente)).resolves.toMatchObject({
                observacoes: "editada pela ficha",
            });
        });

        it("PUT /fichas-tecnicas/:id recusa mudar as perdas da concluída, mas aceita reenviar o mesmo valor", async () => {
            for (const campo of ["defeitos_costura", "defeitos_tecido", "retiradas", "sobras"]) {
                await request(app.getHttpServer())
                    .put(`/fichas-tecnicas/${comMatriz.ficha}`)
                    .set(auth())
                    .send({ [campo]: 1 })
                    .expect(409);
            }

            await request(app.getHttpServer())
                .put(`/fichas-tecnicas/${comMatriz.ficha}`)
                .set(auth())
                .send({ defeitos_costura: 0, defeitos_tecido: 0, retiradas: 0, sobras: 0 })
                .expect(200);

            await expect(lerFicha(comMatriz.ficha)).resolves.toMatchObject({
                defeitos_costura: 0,
                defeitos_tecido: 0,
                retiradas: 0,
                sobras: 0,
            });
        });

        it("DELETE da ficha concluída e de sua matriz responde 409 e mantém tudo", async () => {
            await request(app.getHttpServer())
                .delete(`/fichas-tecnicas/${comMatriz.ficha}/itens`)
                .set(auth())
                .expect(409);
            await request(app.getHttpServer())
                .delete(`/fichas-tecnicas/${comMatriz.ficha}`)
                .set(auth())
                .expect(409);

            await expect(lerFicha(comMatriz.ficha)).resolves.toMatchObject({ concluida: true });
            await expect(
                prisma.fichaTecnicaItem.count({ where: { ficha_tecnica_id: comMatriz.ficha } }),
            ).resolves.toBe(1);
        });

        it("PUT /fichas-tecnicas/:id ignora etapa_atual_id: a etapa só muda pela transferência", async () => {
            const antes = await lerFicha(ids.fichaPendente);

            await request(app.getHttpServer())
                .put(`/fichas-tecnicas/${ids.fichaPendente}`)
                .set(auth())
                .send({ etapa_atual_id: etapas.final, observacoes: "etapa ignorada" })
                .expect(200);

            const depois = await lerFicha(ids.fichaPendente);
            expect(depois.etapa_atual_id).toBe(antes.etapa_atual_id);
            expect(depois.observacoes).toBe("etapa ignorada");
        });

        it("POST /fichas-tecnicas não existe mais: a ficha só nasce junto do pedido", async () => {
            await request(app.getHttpServer())
                .post("/fichas-tecnicas")
                .set(auth())
                .send({
                    produto_id: ids.produtoPendente,
                    pedido_id: ids.pedido,
                    etapa_atual_id: etapas.final,
                    quantidade: 0,
                })
                .expect(404);

            await expect(
                prisma.fichaTecnica.count({ where: { pedido_id: ids.pedido } }),
            ).resolves.toBe(2);
        });

        it("ficha criada pela API já abre o histórico da etapa inicial e pode ser transferida", async () => {
            const criado = await request(app.getHttpServer())
                .post("/pedidos/completo")
                .set({ ...auth(), "Idempotency-Key": `${runId}-nasce-com-historico` })
                .send({ fichas: [{ produto_id: ids.produtoConcluido, quantidade: 0 }] })
                .expect(201);

            const fichaId: number = criado.body.fichas_tecnicas[0].id;
            await expect(lerFicha(fichaId)).resolves.toMatchObject({
                etapa_atual_id: etapas.inicial,
            });
            await expect(
                prisma.fichaEtapa.findMany({ where: { ficha_tecnica_id: fichaId } }),
            ).resolves.toEqual([
                expect.objectContaining({ etapa_id: etapas.inicial, data_fim: null }),
            ]);

            await request(app.getHttpServer())
                .post("/fichas-tecnicas/transferir-etapa")
                .set(auth())
                .send({
                    ficha_tecnica_id: fichaId,
                    etapa_origem_id: etapas.inicial,
                    etapa_destino_id: etapas.meio,
                })
                .expect(201);

            await expect(lerFicha(fichaId)).resolves.toMatchObject({
                etapa_atual_id: etapas.meio,
            });
            await expect(
                prisma.fichaEtapa.count({ where: { ficha_tecnica_id: fichaId } }),
            ).resolves.toBe(2);
        });
    });
});
