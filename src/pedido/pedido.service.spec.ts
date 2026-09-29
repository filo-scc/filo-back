import { Test, TestingModule } from "@nestjs/testing";
import {
    BadRequestException,
    ConflictException,
    NotFoundException,
    InternalServerErrorException,
} from "@nestjs/common";

import { PedidoService } from "./pedido.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

describe("PedidoService", () => {
    let service: PedidoService;

    const usuario: AuthenticatedUser = {
        id: 1,
        email: "gerente@teste.com",
        nome: "Gerente",
        foto_de_perfil: null,
        cargo: "GERENTE",
        fabrico_id: 1,
        fabrico: { id: 1, ativo: true },
    };

    const mockPrismaService = {
        pedido: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            delete: jest.fn(),
        },

        cliente: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },

        fabrico: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },

        produto: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },

        gradeVersao: {
            findFirst: jest.fn(),
        },

        gradeVersaoItem: {
            findMany: jest.fn(),
        },

        fabricoGrade: {
            findFirst: jest.fn(),
        },

        etapa: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },

        cor: {
            findMany: jest.fn(),
        },

        parceiro: {
            findMany: jest.fn(),
        },

        parceiroProduto: {
            upsert: jest.fn(),
        },

        clienteProduto: {
            upsert: jest.fn(),
            findMany: jest.fn(),
        },

        fichaTecnica: {
            create: jest.fn(),
            findFirst: jest.fn(),
            count: jest.fn(),
            updateMany: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
        },

        fichaTecnicaItem: {
            createMany: jest.fn(),
            deleteMany: jest.fn(),
            aggregate: jest.fn(),
        },

        fichaEtapa: {
            create: jest.fn(),
            deleteMany: jest.fn(),
        },

        fichaParceiro: {
            create: jest.fn(),
            deleteMany: jest.fn(),
        },

        $transaction: jest.fn(),
        $executeRaw: jest.fn(),
        $queryRaw: jest.fn(),
    };

    const mockProdutoService = {
        bloquearProdutosParaRecalculo: jest.fn(),
        recalcularCustoTotal: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PedidoService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: ProdutoService,
                    useValue: mockProdutoService,
                },
            ],
        }).compile();

        service = module.get<PedidoService>(PedidoService);

        jest.resetAllMocks();

        mockPrismaService.$transaction.mockImplementation(
            async (callback: (tx: unknown) => unknown) => callback(mockPrismaService),
        );
        mockPrismaService.$executeRaw.mockResolvedValue(1);
        mockPrismaService.$queryRaw.mockResolvedValue([{ id: 100 }]);
        mockPrismaService.fichaTecnica.count.mockResolvedValue(1);
        mockPrismaService.pedido.updateMany.mockResolvedValue({ count: 0 });
        mockPrismaService.fabricoGrade.findFirst.mockResolvedValue({ id: 1 });
        mockPrismaService.gradeVersao.findFirst.mockResolvedValue({ id: 3, grade_id: 2 });
        mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
        mockPrismaService.fichaTecnicaItem.aggregate.mockResolvedValue({
            _sum: { quantidade: 30 },
            _count: { _all: 1 },
        });
        mockPrismaService.clienteProduto.findMany.mockResolvedValue([]);
        mockPrismaService.produto.findFirst.mockImplementation(async (args: any) => ({
            id: args?.where?.id || 5,
            fabrico_id: 1,
        }));
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("create", () => {
        it("deve criar um pedido", async () => {
            const pedido = {
                id: 1,
                finalizado: false,
                fabrico_id: 1,
            };

            mockPrismaService.pedido.findFirst.mockResolvedValue(null);
            mockPrismaService.pedido.create.mockResolvedValue(pedido);

            const result = await service.create(
                {
                    cor: "#FFFFFF",
                    quantidade: 10,
                    custo_total: 125.5,
                },
                1,
            );

            expect(result).toEqual(pedido);

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    finalizado: false,
                    quantidade: 10,
                    custo_total: 125.5,
                    fabrico_id: 1,
                }),
            });
        });

        it("deve rejeitar cliente de outro fabrico", async () => {
            mockPrismaService.cliente.findFirst.mockResolvedValue(null);

            await expect(
                service.create(
                    {
                        cor: "#FFFFFF",
                        quantidade: 1,
                        cliente_id: 99,
                    },
                    1,
                ),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("createCompleto", () => {
        const dtoBase = {
            cliente_id: 7,
            idempotency_key: "chave-base",
            fichas: [
                {
                    produto_id: 5,
                    grade_versao_id: 3,
                    quantidade: 30,
                    preco_padrao: 20,
                    nome_para_cliente: "Camisa do cliente",
                    cores_ids: [1],
                    itens: [
                        { cor_id: 1, grade_versao_item_id: 11, quantidade: 10 },
                        { cor_id: 1, grade_versao_item_id: 12, quantidade: 20 },
                    ],
                    parceiros: [{ parceiro_id: 9, operacao: "Costura", preco: 4 }],
                },
            ],
        };

        it("deve rejeitar duas fichas do mesmo produto sem gravar nada", async () => {
            await expect(
                service.createCompleto(
                    {
                        ...dtoBase,
                        fichas: [
                            { ...dtoBase.fichas[0] },
                            { ...dtoBase.fichas[0], grade_versao_id: 4 },
                        ],
                    },
                    1,
                    "chave-teste",
                ),
            ).rejects.toThrow(
                "Não é permitido mais de uma ficha técnica do mesmo produto no pedido",
            );
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.create).not.toHaveBeenCalled();
        });

        const prepararCenarioFeliz = () => {
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany
                .mockResolvedValueOnce([{ id: 5, grade_versao_id: 3 }])
                .mockResolvedValueOnce([{ id: 5 }])
                .mockResolvedValueOnce([{ id: 5, custo_total: 10 }]);
            mockPrismaService.produto.findFirst.mockResolvedValue({ id: 5 });
            mockPrismaService.gradeVersao.findFirst.mockResolvedValue({ id: 3, grade_id: 2 });
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue({ id: 1 });
            mockPrismaService.parceiro.findMany.mockResolvedValue([{ id: 9 }]);
            mockPrismaService.gradeVersao.findFirst.mockResolvedValue({ id: 3 });
            mockPrismaService.produto.update.mockResolvedValue({});
            mockPrismaService.etapa.findFirst
                .mockResolvedValueOnce({ id: 2 })
                .mockResolvedValueOnce({ id: 8 });
            mockPrismaService.pedido.findFirst.mockImplementation(async (args: any) =>
                args?.where?.idempotency_key ? null : { numero: 6 },
            );
            mockPrismaService.pedido.create.mockResolvedValue({ id: 100 });
            mockPrismaService.fichaTecnica.findFirst.mockResolvedValue({ numero: 4 });
            mockPrismaService.fichaTecnica.create.mockResolvedValue({ id: 200 });
            mockPrismaService.cor.findMany.mockResolvedValue([{ id: 1 }]);
            mockPrismaService.gradeVersaoItem.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }]);
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100, numero: 7 });
        };

        it("deve exigir chave de idempotência sem consultar nem gravar nada", async () => {
            const semChave = { ...dtoBase, idempotency_key: undefined };

            await expect(service.createCompleto(semChave as any, 1, undefined)).rejects.toThrow(
                "Informe o header Idempotency-Key para criar o pedido",
            );

            await expect(service.createCompleto(semChave as any, 1, "   ")).rejects.toThrow(
                BadRequestException,
            );

            expect(mockPrismaService.pedido.findFirst).not.toHaveBeenCalled();
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
        });

        it("deve aceitar a chave pelo header quando o body não traz", async () => {
            prepararCenarioFeliz();
            const semChave = { ...dtoBase, idempotency_key: undefined };

            await service.createCompleto(semChave as any, 1, "chave-header");

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ idempotency_key: "chave-header" }),
            });
        });

        it("deve criar pedido, ficha e vínculos dentro de uma única transação", async () => {
            prepararCenarioFeliz();

            const resultado = await service.createCompleto(dtoBase, 1, "chave-teste");

            expect(resultado).toEqual({ id: 100, numero: 7 });
            expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    fabrico_id: 1,
                    cliente_id: 7,
                    numero: 7,
                    finalizado: false,
                    quantidade: 30,
                    custo_total: 300,
                    valor_total: 600,
                }),
            });

            expect(mockPrismaService.fichaTecnica.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    pedido_id: 100,
                    produto_id: 5,
                    fabrico_id: 1,
                    grade_versao_id: 3,
                    etapa_atual_id: 2,
                    quantidade: 0,
                    concluida: false,
                    numero: 5,
                }),
            });

            expect(mockPrismaService.fichaTecnicaItem.createMany).toHaveBeenCalledWith({
                data: [
                    {
                        ficha_tecnica_id: 200,
                        cor_id: 1,
                        grade_versao_item_id: 11,
                        quantidade: 10,
                    },
                    {
                        ficha_tecnica_id: 200,
                        cor_id: 1,
                        grade_versao_item_id: 12,
                        quantidade: 20,
                    },
                ],
            });

            expect(mockPrismaService.fichaEtapa.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ ficha_tecnica_id: 200, etapa_id: 2 }),
            });

            expect(mockPrismaService.parceiroProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: { produto_id: 5, parceiro_id: 9, preco: 4 },
                    update: { preco: 4 },
                }),
            );

            expect(mockProdutoService.recalcularCustoTotal).toHaveBeenCalledWith(
                5,
                mockPrismaService,
            );

            expect(mockPrismaService.fichaParceiro.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    ficha_id: 200,
                    parceiro_id: 9,
                    operacao: "Costura",
                    quantidade: 30,
                    valor: 120,
                }),
            });

            expect(mockPrismaService.clienteProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        cliente_id: 7,
                        produto_id: 5,
                        nome_para_cliente: "Camisa do cliente",
                        preco_padrao: 20,
                    }),
                }),
            );
        });

        it("não deve calcular valor_total quando o pedido não tem cliente", async () => {
            mockPrismaService.produto.findMany
                .mockResolvedValueOnce([{ id: 5, grade_versao_id: 3 }])
                .mockResolvedValueOnce([{ id: 5 }])
                .mockResolvedValueOnce([{ id: 5, custo_total: 10 }]);
            mockPrismaService.gradeVersao.findFirst.mockResolvedValue({ id: 3, grade_id: 2 });
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue({ id: 1 });
            mockPrismaService.etapa.findFirst
                .mockResolvedValueOnce({ id: 2 })
                .mockResolvedValueOnce({ id: 8 });
            mockPrismaService.pedido.findFirst.mockResolvedValue(null);
            mockPrismaService.pedido.create.mockResolvedValue({ id: 101 });
            mockPrismaService.fichaTecnica.findFirst.mockResolvedValue(null);
            mockPrismaService.fichaTecnica.create.mockResolvedValue({ id: 201 });
            mockPrismaService.cor.findMany.mockResolvedValue([{ id: 1 }]);
            mockPrismaService.gradeVersaoItem.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }]);
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 101 });

            await service.createCompleto(
                {
                    idempotency_key: "chave-teste",
                    fichas: [
                        {
                            produto_id: 5,
                            grade_versao_id: 3,
                            quantidade: 30,
                            cores_ids: [1],
                            itens: [{ cor_id: 1, grade_versao_item_id: 11, quantidade: 30 }],
                        },
                    ],
                } as any,
                1,
                "chave-teste",
            );

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    numero: 1,
                    cliente_id: null,
                    custo_total: 300,
                    valor_total: null,
                }),
            });

            expect(mockPrismaService.clienteProduto.upsert).not.toHaveBeenCalled();
        });

        it("deve persistir preços e totais com ROUND_HALF_UP na mesma escala", async () => {
            prepararCenarioFeliz();

            await service.createCompleto(
                {
                    ...dtoBase,
                    fichas: [
                        {
                            ...dtoBase.fichas[0],
                            quantidade: 3,
                            preco_padrao: 1.005,
                            itens: [{ cor_id: 1, grade_versao_item_id: 11, quantidade: 3 }],
                            parceiros: [{ parceiro_id: 9, operacao: "Costura", preco: 1.005 }],
                        },
                    ],
                },
                1,
                "chave-teste",
            );

            expect(mockPrismaService.parceiroProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: { produto_id: 5, parceiro_id: 9, preco: 1.005 },
                    update: { preco: 1.005 },
                }),
            );
            expect(mockPrismaService.clienteProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        preco_padrao: 1.005,
                    }),
                }),
            );
            expect(mockPrismaService.fichaParceiro.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    valor: 3.015,
                }),
            });
            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    quantidade: 3,
                    valor_total: 3.015,
                }),
            });
        });

        it("deve reutilizar o pedido quando a chave de idempotência já existe", async () => {
            const existente = { id: 100, numero: 7, fichas_tecnicas: [] };
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, grade_versao_id: 3 }]);
            mockPrismaService.pedido.findFirst.mockResolvedValue(existente);

            const resultado = await service.createCompleto(
                { ...dtoBase, idempotency_key: "req-1" },
                1,
                "req-1",
            );

            expect(resultado).toEqual(existente);
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.create).not.toHaveBeenCalled();
        });

        it("deve devolver o pedido criado se outro request gravar a mesma chave durante a transação", async () => {
            prepararCenarioFeliz();
            const existente = { id: 100, numero: 7 };
            mockPrismaService.pedido.findFirst
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(existente);

            const resultado = await service.createCompleto(
                { ...dtoBase, idempotency_key: "req-2" },
                1,
                "req-2",
            );

            expect(resultado).toEqual(existente);
            expect(mockPrismaService.pedido.create).not.toHaveBeenCalled();
        });

        it("deve rejeitar produto de outro fabrico antes de abrir a transação", async () => {
            mockPrismaService.produto.findMany.mockResolvedValueOnce([]);

            await expect(
                service.createCompleto(
                    {
                        fichas: [
                            {
                                produto_id: 5,
                                quantidade: 1,
                                cores_ids: [1],
                                itens: [{ cor_id: 1, grade_versao_item_id: 11, quantidade: 1 }],
                            },
                        ],
                    } as any,
                    1,
                    "chave-teste",
                ),
            ).rejects.toThrow(NotFoundException);

            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
        });

        it("rejeita grade_versao_id não liberada para o fabrico via FabricoGrade", async () => {
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 10, grade_versao_id: 30 }]);
            mockPrismaService.gradeVersao.findFirst.mockResolvedValue(null);

            const payload = {
                fichas: [{ produto_id: 10, grade_versao_id: 999, quantidade: 10 }],
            };

            await expect(service.createCompleto(payload as any, 20, "chave-teste")).rejects.toThrow(
                "Versão de grade inválida, inativa ou não liberada para este fabrico",
            );

            expect(mockPrismaService.produto.update).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.create).not.toHaveBeenCalled();
        });

        it("deve rejeitar cor que não pertence ao fabrico, sem persistir o pedido", async () => {
            prepararCenarioFeliz();
            mockPrismaService.cor.findMany.mockResolvedValue([]);

            await expect(service.createCompleto(dtoBase, 1, "chave-teste")).rejects.toThrow(
                BadRequestException,
            );
        });

        it("deve rejeitar grade não liberada para o fabrico", async () => {
            prepararCenarioFeliz();
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);

            await expect(service.createCompleto(dtoBase, 1, "chave-teste")).rejects.toThrow(
                "A grade informada não está liberada para este fabrico",
            );
        });

        it("deve rejeitar etapa inativa informada no createCompleto", async () => {
            prepararCenarioFeliz();
            mockPrismaService.etapa.findMany.mockResolvedValue([]);

            await expect(
                service.createCompleto(
                    {
                        ...dtoBase,
                        fichas: [{ ...dtoBase.fichas[0], etapa_atual_id: 99 } as any],
                    },
                    1,
                    "chave-teste",
                ),
            ).rejects.toThrow(
                "Uma ou mais etapas não pertencem ao fabrico do pedido ou estão inativas",
            );
        });

        it("deve rejeitar ficha com quantidade positiva sem matriz no createCompleto", async () => {
            await expect(
                service.createCompleto(
                    {
                        fichas: [{ produto_id: 5, quantidade: 30 }],
                    } as any,
                    1,
                    "chave-teste",
                ),
            ).rejects.toThrow();

            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
        });

        it("deve rejeitar matriz cuja soma diverge da quantidade da ficha", async () => {
            prepararCenarioFeliz();

            await expect(
                service.createCompleto(
                    {
                        ...dtoBase,
                        fichas: [
                            {
                                ...dtoBase.fichas[0],
                                quantidade: 30,
                                itens: [
                                    { cor_id: 1, grade_versao_item_id: 11, quantidade: 5 },
                                    { cor_id: 1, grade_versao_item_id: 12, quantidade: 5 },
                                ],
                            },
                        ],
                    },
                    1,
                    "chave-teste",
                ),
            ).rejects.toThrow();
        });

        it("mantém rollback completo quando a validação de quantidade falha na segunda ficha da transação", async () => {
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany.mockResolvedValueOnce([
                { id: 5, grade_versao_id: 3 },
                { id: 6, grade_versao_id: 4 },
            ]);
            mockPrismaService.cor.findMany.mockResolvedValue([{ id: 1 }]);
            mockPrismaService.gradeVersaoItem.findMany.mockResolvedValue([{ id: 11 }]);
            mockPrismaService.etapa.findFirst.mockResolvedValue({ id: 2 });
            mockPrismaService.pedido.findFirst.mockResolvedValue({ numero: 6 });

            const payload = {
                cliente_id: 7,
                fichas: [
                    {
                        produto_id: 5,
                        grade_versao_id: 3,
                        quantidade: 10,
                        cores_ids: [1],
                        itens: [{ cor_id: 1, grade_versao_item_id: 11, quantidade: 10 }],
                    },
                    {
                        produto_id: 6,
                        grade_versao_id: 4,
                        quantidade: 30,
                        cores_ids: [1],
                        itens: [{ cor_id: 1, grade_versao_item_id: 11, quantidade: 5 }],
                    },
                ],
            };

            await expect(
                service.createCompleto(payload as any, 1, "chave-teste"),
            ).rejects.toThrow();
        });

        it("deve exigir ao menos uma ficha técnica", async () => {
            await expect(
                service.createCompleto({ fichas: [] } as any, 1, "chave-teste"),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe("updateCompleto", () => {
        const pedidoExistente = {
            id: 100,
            fabrico_id: 1,
            cliente_id: 7,
            finalizado: false,
            fichas_tecnicas: [{ id: 200, produto_id: 5, quantidade: 30, pedido_id: 100 }],
        };

        it("deve rejeitar ficha nova de produto que ja tem ficha no pedido", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);

            await expect(
                service.updateCompleto(
                    100,
                    {
                        fichas: [
                            { id: 200, produto_id: 5, quantidade: 30 },
                            { produto_id: 5, quantidade: 0 },
                        ],
                    } as any,
                    1,
                ),
            ).rejects.toThrow("Há fichas técnicas duplicadas no payload");
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.create).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.update).not.toHaveBeenCalled();
        });

        it("deve atualizar cliente, preço e totais em uma única transação", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 8, fabrico_id: 1 });
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, custo_total: 10 }]);
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100, cliente_id: 8 });
            mockPrismaService.fichaTecnicaItem.aggregate.mockResolvedValue({
                _sum: { quantidade: 30 },
                _count: { _all: 1 },
            });

            const resultado = await service.updateCompleto(
                100,
                {
                    cliente_id: 8,
                    fichas: [
                        {
                            id: 200,
                            produto_id: 5,
                            quantidade: 30,
                            preco_padrao: 25,
                            nome_para_cliente: "Nova ref",
                        },
                    ],
                } as any,
                1,
            );

            expect(resultado).toEqual({ id: 100, cliente_id: 8 });
            expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
            expect(mockPrismaService.fichaTecnica.create).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.deleteMany).not.toHaveBeenCalled();

            expect(mockPrismaService.clienteProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        cliente_id: 8,
                        produto_id: 5,
                        nome_para_cliente: "Nova ref",
                        preco_padrao: 25,
                    }),
                }),
            );

            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: expect.objectContaining({
                    cliente_id: 8,
                    quantidade: 30,
                    custo_total: 300,
                    valor_total: 750,
                }),
            });
        });

        it("deve atualizar a quantidade da ficha sem reenviar matriz quando a soma já confere", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                ...pedidoExistente,
                fichas_tecnicas: [{ id: 200, produto_id: 5, quantidade: 20, pedido_id: 100 }],
            });
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, custo_total: 10 }]);
            mockPrismaService.clienteProduto.findMany.mockResolvedValue([
                { produto_id: 5, preco_padrao: 20 },
            ]);
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100, cliente_id: 7 });
            mockPrismaService.fichaTecnicaItem.aggregate.mockResolvedValue({
                _sum: { quantidade: 30 },
                _count: { _all: 2 },
            });

            await service.updateCompleto(
                100,
                {
                    fichas: [
                        {
                            id: 200,
                            produto_id: 5,
                            quantidade: 30,
                        },
                    ],
                } as any,
                1,
            );

            expect(mockPrismaService.fichaTecnica.update).toHaveBeenCalledWith({
                where: { id: 200 },
                data: { quantidade: 30 },
            });
            expect(mockPrismaService.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: expect.objectContaining({
                    quantidade: 30,
                    custo_total: 300,
                    valor_total: 600,
                }),
            });
        });

        it("deve recuperar preco_padrao persistido ao editar só a data sem reenviar o preço", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, custo_total: 10 }]);
            mockPrismaService.clienteProduto.findMany.mockResolvedValue([
                { produto_id: 5, preco_padrao: 25 },
            ]);
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100, cliente_id: 7 });
            mockPrismaService.fichaTecnicaItem.aggregate.mockResolvedValue({
                _sum: { quantidade: 30 },
                _count: { _all: 1 },
            });

            await service.updateCompleto(
                100,
                {
                    data_prevista: "2026-10-01T00:00:00.000Z",
                    fichas: [
                        {
                            id: 200,
                            produto_id: 5,
                            quantidade: 30,
                        },
                    ],
                } as any,
                1,
            );

            expect(mockPrismaService.clienteProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: {},
                }),
            );
            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: expect.objectContaining({
                    data_prevista: new Date("2026-10-01T00:00:00.000Z"),
                    quantidade: 30,
                    custo_total: 300,
                    valor_total: 750,
                }),
            });
        });

        it("deve zerar valor_total quando preco_padrao é enviado explicitamente como null", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, custo_total: 10 }]);
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100, cliente_id: 7 });
            mockPrismaService.fichaTecnicaItem.aggregate.mockResolvedValue({
                _sum: { quantidade: 30 },
                _count: { _all: 1 },
            });

            await service.updateCompleto(
                100,
                {
                    fichas: [
                        {
                            id: 200,
                            produto_id: 5,
                            quantidade: 30,
                            preco_padrao: null,
                        },
                    ],
                } as any,
                1,
            );

            expect(mockPrismaService.clienteProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: { preco_padrao: null },
                }),
            );
            expect(mockPrismaService.clienteProduto.findMany).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: expect.objectContaining({
                    valor_total: 0,
                }),
            });
        });

        it("deve rejeitar quantidade positiva sem matriz coerente na ficha existente", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.fichaTecnicaItem.aggregate.mockResolvedValue({
                _sum: { quantidade: 10 },
                _count: { _all: 1 },
            });

            await expect(
                service.updateCompleto(
                    100,
                    {
                        fichas: [
                            {
                                id: 200,
                                produto_id: 5,
                                quantidade: 30,
                            },
                        ],
                    } as any,
                    1,
                ),
            ).rejects.toThrow();
        });

        it("deve persistir observacoes e ignorar etapa_atual_id em ficha existente", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, custo_total: 10 }]);
            mockPrismaService.etapa.findFirst.mockReset();
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100, cliente_id: 7 });

            await service.updateCompleto(
                100,
                {
                    fichas: [
                        {
                            id: 200,
                            produto_id: 5,
                            quantidade: 30,
                            observacoes: "Obs atualizada",
                            etapa_atual_id: 40,
                        },
                    ],
                } as any,
                1,
            );

            expect(mockPrismaService.etapa.findFirst).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.update).toHaveBeenCalledWith({
                where: { id: 200 },
                data: { observacoes: "Obs atualizada" },
            });
            expect(mockPrismaService.fichaEtapa.create).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
        });

        it("nao deve alterar a etapa de ficha existente quando so etapa_atual_id muda", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, custo_total: 10 }]);
            mockPrismaService.etapa.findFirst.mockReset();
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100, cliente_id: 7 });

            await service.updateCompleto(
                100,
                {
                    fichas: [
                        {
                            id: 200,
                            produto_id: 5,
                            quantidade: 30,
                            etapa_atual_id: 99,
                        },
                    ],
                } as any,
                1,
            );

            expect(mockPrismaService.etapa.findFirst).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.update).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaEtapa.create).not.toHaveBeenCalled();
        });

        it("deve rejeitar grade_versao_id em ficha existente sem itens ou cores_ids", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);

            await expect(
                service.updateCompleto(
                    100,
                    {
                        fichas: [
                            {
                                id: 200,
                                produto_id: 5,
                                quantidade: 30,
                                grade_versao_id: 31,
                            },
                        ],
                    } as any,
                    1,
                ),
            ).rejects.toThrow();

            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
        });

        it("deve remover fichas ausentes do payload e criar as novas", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany
                .mockResolvedValueOnce([{ id: 6, grade_versao_id: 3 }])
                .mockResolvedValueOnce([{ id: 6 }])
                .mockResolvedValueOnce([{ id: 6, custo_total: 8 }]);
            mockPrismaService.produto.findFirst.mockResolvedValue({ id: 6 });
            mockPrismaService.gradeVersao.findFirst.mockResolvedValue({ id: 3, grade_id: 2 });
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue({ id: 1 });
            mockPrismaService.parceiro.findMany.mockResolvedValue([{ id: 9 }]);
            mockPrismaService.gradeVersao.findFirst.mockResolvedValue({ id: 3 });
            mockPrismaService.produto.update.mockResolvedValue({});
            mockPrismaService.etapa.findFirst
                .mockResolvedValueOnce({ id: 2 })
                .mockResolvedValueOnce({ id: 8 });
            mockPrismaService.fichaTecnica.findFirst.mockResolvedValue({ numero: 4 });
            mockPrismaService.fichaTecnica.create.mockResolvedValue({ id: 201 });
            mockPrismaService.cor.findMany.mockResolvedValue([{ id: 1 }]);
            mockPrismaService.gradeVersaoItem.findMany.mockResolvedValue([{ id: 11 }]);
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100 });

            await service.updateCompleto(
                100,
                {
                    cliente_id: 7,
                    fichas: [
                        {
                            produto_id: 6,
                            grade_versao_id: 3,
                            quantidade: 10,
                            preco_padrao: 15,
                            cores_ids: [1],
                            itens: [{ cor_id: 1, grade_versao_item_id: 11, quantidade: 10 }],
                            parceiros: [{ parceiro_id: 9, preco: 2 }],
                        },
                    ],
                } as any,
                1,
            );

            expect(mockPrismaService.fichaEtapa.deleteMany).toHaveBeenCalledWith({
                where: { ficha_tecnica_id: { in: [200] } },
            });
            expect(mockPrismaService.fichaTecnica.deleteMany).toHaveBeenCalledWith({
                where: { id: { in: [200] }, pedido_id: 100 },
            });
            expect(mockPrismaService.fichaTecnica.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    pedido_id: 100,
                    produto_id: 6,
                    quantidade: 0,
                }),
            });
            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: expect.objectContaining({
                    quantidade: 10,
                    custo_total: 80,
                    valor_total: 150,
                }),
            });
        });

        it("deve manter cliente_id e data_prevista quando omitidos e ainda sincronizar ClienteProduto", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                ...pedidoExistente,
                data_prevista: new Date("2026-09-20"),
                observacoes: "Obs atual",
            });
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, custo_total: 10 }]);
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100, cliente_id: 7 });

            await service.updateCompleto(
                100,
                {
                    fichas: [
                        {
                            id: 200,
                            produto_id: 5,
                            quantidade: 30,
                            preco_padrao: 20,
                            nome_para_cliente: "Ref mantida",
                        },
                    ],
                } as any,
                1,
            );

            expect(mockPrismaService.clienteProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        cliente_id: 7,
                        produto_id: 5,
                        nome_para_cliente: "Ref mantida",
                        preco_padrao: 20,
                    }),
                }),
            );

            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: {
                    quantidade: 30,
                    custo_total: 300,
                    valor_total: 600,
                },
            });
        });

        it("deve limpar cliente_id e data_prevista apenas quando enviados como null", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, custo_total: 10 }]);
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100, cliente_id: null });

            await service.updateCompleto(
                100,
                {
                    cliente_id: null,
                    data_prevista: null,
                    fichas: [
                        {
                            id: 200,
                            produto_id: 5,
                            quantidade: 30,
                        },
                    ],
                } as any,
                1,
            );

            expect(mockPrismaService.clienteProduto.upsert).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: expect.objectContaining({
                    cliente_id: null,
                    data_prevista: null,
                    valor_total: null,
                }),
            });
        });

        it("rejeita tentativa de trocar produto de ficha existente para produto de outro fabrico", async () => {
            const fichaExistente = {
                id: 500,
                pedido_id: 1,
                produto_id: 10,
                fabrico_id: 10,
                quantidade: 50,
                grade_versao_id: 30,
            };
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                id: 1,
                fabrico_id: 10,
                fichas_tecnicas: [fichaExistente],
            });

            mockPrismaService.produto.findFirst.mockResolvedValue(null);

            const payload = {
                fichas: [
                    {
                        id: 500,
                        produto_id: 999,
                        parceiros: [{ parceiro_id: 7, preco: 10 }],
                    },
                ],
            };

            await expect(service.updateCompleto(1, payload as any, 10)).rejects.toThrow(
                new BadRequestException(
                    "Não é permitido alterar o produto de uma ficha técnica existente",
                ),
            );

            expect(mockPrismaService.parceiroProduto.upsert).not.toHaveBeenCalled();
            expect(mockPrismaService.produto.update).not.toHaveBeenCalled();
        });

        it("deve rejeitar ficha que não pertence ao pedido", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);

            await expect(
                service.updateCompleto(
                    100,
                    { fichas: [{ id: 999, produto_id: 5, quantidade: 1 }] } as any,
                    1,
                ),
            ).rejects.toThrow(BadRequestException);

            expect(mockPrismaService.pedido.create).not.toHaveBeenCalled();
        });

        it("deve rejeitar tentativa de alterar o produto de uma ficha existente", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);

            await expect(
                service.updateCompleto(
                    100,
                    {
                        fichas: [
                            {
                                id: 200,
                                produto_id: 999,
                                quantidade: 30,
                                parceiros: [{ parceiro_id: 1, preco: 10 }],
                            },
                        ],
                    } as any,
                    1,
                ),
            ).rejects.toThrow(BadRequestException);
        });

        it("deve rejeitar sincronização de preço quando o produto não pertence ao fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findFirst.mockResolvedValue(null);

            await expect(
                service.updateCompleto(
                    100,
                    {
                        fichas: [
                            {
                                id: 200,
                                produto_id: 5,
                                quantidade: 30,
                                parceiros: [{ parceiro_id: 9, preco: 4 }],
                            },
                        ],
                    } as any,
                    1,
                ),
            ).rejects.toThrow(NotFoundException);

            expect(mockPrismaService.parceiroProduto.upsert).not.toHaveBeenCalled();
            expect(mockProdutoService.recalcularCustoTotal).not.toHaveBeenCalled();
        });

        it("deve rejeitar pedido inexistente no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(null);

            await expect(
                service.updateCompleto(
                    100,
                    {
                        fichas: [
                            {
                                produto_id: 5,
                                quantidade: 1,
                                cores_ids: [1],
                                itens: [{ cor_id: 1, grade_versao_item_id: 11, quantidade: 1 }],
                            },
                        ],
                    } as any,
                    1,
                ),
            ).rejects.toThrow(NotFoundException);
        });

        it("deve rejeitar edição de pedido finalizado", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                ...pedidoExistente,
                finalizado: true,
            });

            await expect(
                service.updateCompleto(
                    100,
                    {
                        fichas: [
                            {
                                id: 200,
                                produto_id: 5,
                                quantidade: 30,
                            },
                        ],
                    } as any,
                    1,
                ),
            ).rejects.toThrow(ConflictException);

            expect(mockPrismaService.pedido.update).not.toHaveBeenCalled();
        });

        it("deve exigir ao menos uma ficha técnica", async () => {
            await expect(service.updateCompleto(100, { fichas: [] } as any, 1)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe("findAll", () => {
        it("deve retornar pedidos do fabrico", async () => {
            const pedidos = [
                {
                    id: 1,
                    finalizado: false,
                    fabrico_id: 1,
                },
            ];

            mockPrismaService.pedido.findMany.mockResolvedValue(pedidos);

            const result = await service.findAll(1);

            expect(result).toEqual(pedidos);

            expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 1 },
                include: {
                    cliente: true,
                    fichas_tecnicas: {
                        include: { fichas_etapas: true },
                    },
                },
            });
        });
    });

    describe("findOne", () => {
        it("deve retornar um pedido", async () => {
            const pedido = {
                id: 1,
                finalizado: false,
                fabrico_id: 1,
            };

            mockPrismaService.pedido.findFirst.mockResolvedValue(pedido);

            const result = await service.getById(1, 1);

            expect(result).toEqual(pedido);
            expect(mockPrismaService.pedido.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: 1 },
            });
        });

        it("deve lançar NotFoundException se pedido não existir no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(null);

            await expect(service.getById(1, 1)).rejects.toThrow(NotFoundException);
        });
    });

    describe("findByCliente", () => {
        it("deve retornar pedidos de um cliente no fabrico", async () => {
            const pedidos = [
                {
                    id: 1,
                    cliente_id: 7,
                    fabrico_id: 1,
                },
            ];

            mockPrismaService.pedido.findMany.mockResolvedValue(pedidos);

            const result = await service.findAllCliente(7, 1);

            expect(result).toEqual(pedidos);

            expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith({
                where: {
                    cliente_id: 7,
                    fabrico_id: 1,
                },
            });
        });
    });

    describe("update", () => {
        it("deve atualizar um pedido", async () => {
            const pedidoAtualizado = {
                id: 1,
                observacoes: "atualizado",
            };

            mockPrismaService.pedido.findFirst.mockResolvedValue({
                id: 1,
                fabrico_id: 1,
                finalizado: false,
            });

            mockPrismaService.pedido.update.mockResolvedValue(pedidoAtualizado);

            const result = await service.update(
                1,
                {
                    custo_total: 140.75,
                },
                1,
            );

            expect(result).toEqual(pedidoAtualizado);

            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    custo_total: 140.75,
                }),
            });
            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.not.objectContaining({
                    finalizado: expect.anything(),
                }),
            });
        });

        it("deve rejeitar atualização de pedido finalizado", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                id: 1,
                fabrico_id: 1,
                finalizado: true,
            });

            await expect(
                service.update(
                    1,
                    {
                        observacoes: "tentativa",
                    },
                    1,
                ),
            ).rejects.toThrow(BadRequestException);
        });

        it("deve lançar erro se pedido não existir no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(null);

            await expect(
                service.update(
                    1,
                    {
                        observacoes: "x",
                    },
                    1,
                ),
            ).rejects.toThrow(NotFoundException);
        });

        it("deve lançar erro se cliente não existir no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                id: 1,
                fabrico_id: 1,
                finalizado: false,
            });

            mockPrismaService.cliente.findFirst.mockResolvedValue(null);

            await expect(
                service.update(
                    1,
                    {
                        cliente_id: 99,
                    },
                    1,
                ),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("remove", () => {
        it("deve remover um pedido", async () => {
            const pedido = {
                id: 1,
                fabrico_id: 1,
                finalizado: false,
            };

            mockPrismaService.pedido.findFirst.mockResolvedValue(pedido);

            mockPrismaService.pedido.delete.mockResolvedValue(pedido);

            const result = await service.delete(1, 1);

            expect(result).toEqual("O pedido com o id 1 foi deletado com sucesso");

            expect(mockPrismaService.pedido.delete).toHaveBeenCalledWith({
                where: {
                    id: 1,
                },
            });
        });

        it("deve rejeitar exclusão de pedido finalizado", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                id: 1,
                fabrico_id: 1,
                finalizado: true,
            });

            await expect(service.delete(1, 1)).rejects.toThrow(BadRequestException);
            expect(mockPrismaService.pedido.delete).not.toHaveBeenCalled();
        });

        it("deve lançar erro se pedido não existir no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(null);

            await expect(service.delete(1, 1)).rejects.toThrow(NotFoundException);
        });
    });
});
