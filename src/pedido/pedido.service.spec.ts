import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import { PedidoService } from "./pedido.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";

describe("PedidoService", () => {
    let service: PedidoService;

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
            update: jest.fn(),
        },

        gradeVersao: {
            findFirst: jest.fn(),
        },

        gradeVersaoItem: {
            findMany: jest.fn(),
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

        jest.clearAllMocks();

        mockPrismaService.$transaction.mockImplementation(
            async (callback: (tx: unknown) => unknown) => callback(mockPrismaService),
        );
        mockPrismaService.fichaTecnica.count.mockResolvedValue(1);
        mockPrismaService.pedido.updateMany.mockResolvedValue({ count: 0 });
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
                    finalizado: false,
                    cor: "#FFFFFF",
                    quantidade: 10,
                    custo_total: 125.5,
                },
                1,
            );

            expect(result).toEqual(pedido);

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
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
                        finalizado: false,
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
            finalizado: false,
            cliente_id: 7,
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

        const prepararCenarioFeliz = () => {
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany
                .mockResolvedValueOnce([{ id: 5, grade_versao_id: 3 }])
                .mockResolvedValueOnce([{ id: 5, custo_total: 10 }]);
            mockPrismaService.parceiro.findMany.mockResolvedValue([{ id: 9 }]);
            mockPrismaService.etapa.findFirst
                .mockResolvedValueOnce({ id: 2 })
                .mockResolvedValueOnce({ id: 8 });
            mockPrismaService.pedido.findFirst.mockResolvedValue({ numero: 6 });
            mockPrismaService.pedido.create.mockResolvedValue({ id: 100 });
            mockPrismaService.fichaTecnica.findFirst.mockResolvedValue({ numero: 4 });
            mockPrismaService.fichaTecnica.create.mockResolvedValue({ id: 200 });
            mockPrismaService.cor.findMany.mockResolvedValue([{ id: 1 }]);
            mockPrismaService.gradeVersaoItem.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }]);
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100, numero: 7 });
        };

        it("deve criar pedido, ficha e vínculos dentro de uma única transação", async () => {
            prepararCenarioFeliz();

            const resultado = await service.createCompleto(dtoBase, 1);

            expect(resultado).toEqual({ id: 100, numero: 7 });
            expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    fabrico_id: 1,
                    cliente_id: 7,
                    numero: 7,
                    quantidade: 30,
                    // 30 peças x custo 10 do produto
                    custo_total: 300,
                    // 30 peças x preço 20 do cliente
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
                    quantidade: 30,
                    concluida: false,
                    numero: 5,
                }),
            });

            // Toda cor selecionada recebe uma linha por tamanho da grade
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

            // Parceiro único recebe a produção inteira da ficha
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
                .mockResolvedValueOnce([{ id: 5, custo_total: 10 }]);
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
                    fichas: [
                        {
                            produto_id: 5,
                            grade_versao_id: 3,
                            quantidade: 30,
                            cores_ids: [1],
                            itens: [{ cor_id: 1, grade_versao_item_id: 11, quantidade: 30 }],
                        },
                    ],
                },
                1,
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

        it("deve rejeitar produto de outro fabrico antes de abrir a transação", async () => {
            mockPrismaService.produto.findMany.mockResolvedValueOnce([]);

            await expect(
                service.createCompleto({ fichas: [{ produto_id: 5, quantidade: 1 }] }, 1),
            ).rejects.toThrow(NotFoundException);

            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.create).not.toHaveBeenCalled();
        });

        it("deve rejeitar cor que não pertence ao fabrico, sem persistir o pedido", async () => {
            prepararCenarioFeliz();
            mockPrismaService.cor.findMany.mockResolvedValue([]);

            await expect(service.createCompleto(dtoBase, 1)).rejects.toThrow(BadRequestException);
        });

        it("deve exigir ao menos uma ficha técnica", async () => {
            await expect(service.createCompleto({ fichas: [] }, 1)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe("updateCompleto", () => {
        const pedidoExistente = {
            id: 100,
            fabrico_id: 1,
            cliente_id: 7,
            fichas_tecnicas: [{ id: 200, produto_id: 5, quantidade: 30, pedido_id: 100 }],
        };

        it("deve atualizar cliente, preço e totais em uma única transação", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 8, fabrico_id: 1 });
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, custo_total: 10 }]);
            mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100, cliente_id: 8 });

            const resultado = await service.updateCompleto(
                100,
                {
                    cliente_id: 8,
                    fichas: [
                        {
                            id: 200,
                            produto_id: 5,
                            quantidade: 999,
                            preco_padrao: 25,
                            nome_para_cliente: "Nova ref",
                        },
                    ],
                },
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

        it("deve remover fichas ausentes do payload e criar as novas", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany
                .mockResolvedValueOnce([{ id: 6, grade_versao_id: 3 }])
                .mockResolvedValueOnce([{ id: 6, custo_total: 8 }]);
            mockPrismaService.parceiro.findMany.mockResolvedValue([{ id: 9 }]);
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
                },
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
                    quantidade: 10,
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
                },
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
                },
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

        it("deve rejeitar ficha que não pertence ao pedido", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);

            await expect(
                service.updateCompleto(
                    100,
                    { fichas: [{ id: 999, produto_id: 5, quantidade: 1 }] },
                    1,
                ),
            ).rejects.toThrow(BadRequestException);

            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
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
                    },
                    1,
                ),
            ).rejects.toThrow(BadRequestException);

            await expect(
                service.updateCompleto(
                    100,
                    {
                        fichas: [
                            {
                                id: 200,
                                produto_id: 999,
                                quantidade: 30,
                            },
                        ],
                    },
                    1,
                ),
            ).rejects.toThrow("Não é permitido alterar o produto da ficha");

            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
            expect(mockPrismaService.parceiroProduto.upsert).not.toHaveBeenCalled();
        });

        it("deve rejeitar pedido inexistente no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(null);

            await expect(
                service.updateCompleto(100, { fichas: [{ produto_id: 5, quantidade: 1 }] }, 1),
            ).rejects.toThrow(NotFoundException);
        });

        it("deve exigir ao menos uma ficha técnica", async () => {
            await expect(service.updateCompleto(100, { fichas: [] }, 1)).rejects.toThrow(
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
                finalizado: true,
            };

            mockPrismaService.pedido.findFirst.mockResolvedValue({
                id: 1,
                fabrico_id: 1,
            });

            mockPrismaService.pedido.update.mockResolvedValue(pedidoAtualizado);

            const result = await service.update(
                1,
                {
                    finalizado: true,
                    custo_total: 140.75,
                },
                1,
            );

            expect(result).toEqual(pedidoAtualizado);

            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    finalizado: true,
                    custo_total: 140.75,
                }),
            });
        });

        it("deve lançar erro se pedido não existir no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(null);

            await expect(
                service.update(
                    1,
                    {
                        finalizado: true,
                    },
                    1,
                ),
            ).rejects.toThrow(NotFoundException);
        });

        it("deve lançar erro se cliente não existir no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                id: 1,
                fabrico_id: 1,
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

        it("deve lançar erro se pedido não existir no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(null);

            await expect(service.delete(1, 1)).rejects.toThrow(NotFoundException);
        });
    });
});
