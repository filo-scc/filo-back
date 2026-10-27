import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Prisma } from "@prisma/client";

import { PedidoService } from "./pedido.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";
import { toMoney } from "src/common/utils/money";
import { UpdatePedidoDto } from "./dto/update-pedido.dto";
import type { CreatePedidoFichaParceiroDto } from "./dto/create-pedido-completo.dto";

describe("PedidoService", () => {
    let service: PedidoService;

    const fabricoId = 1;

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
            findUnique: jest.fn(),
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
            findMany: jest.fn(),
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
        mockPrismaService.parceiroProduto.findMany.mockResolvedValue([]);
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
                fabricoId,
            );

            expect(result).toEqual(pedido);

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    finalizado: false,
                    quantidade: 10,
                    custo_total: toMoney(125.5),
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
                    fabricoId,
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

        it("deve exigir chave de idempotência sem consultar nem gravar nada", async () => {
            const semChave = { ...dtoBase, idempotency_key: undefined };

            await expect(service.createCompleto(semChave, fabricoId)).rejects.toThrow(
                "Informe o header Idempotency-Key para criar o pedido",
            );
            await expect(service.createCompleto(semChave, fabricoId, "   ")).rejects.toThrow(
                BadRequestException,
            );
            expect(mockPrismaService.pedido.findFirst).not.toHaveBeenCalled();
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.create).not.toHaveBeenCalled();
        });

        it("deve aceitar a chave pelo header quando o body não traz", async () => {
            prepararCenarioFeliz();
            const semChave = { ...dtoBase, idempotency_key: undefined };

            await service.createCompleto(semChave, fabricoId, "chave-header");

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ idempotency_key: "chave-header" }),
            });
        });

        it("deve recusar chave com mais de 128 caracteres sem consultar nem gravar nada", async () => {
            await expect(
                service.createCompleto(dtoBase, fabricoId, "a".repeat(129)),
            ).rejects.toThrow(BadRequestException);
            expect(mockPrismaService.pedido.findFirst).not.toHaveBeenCalled();
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
        });

        it("deve usar a chave do body quando o header não vem", async () => {
            prepararCenarioFeliz();

            await service.createCompleto(dtoBase, fabricoId);

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ idempotency_key: "chave-base" }),
            });
        });

        it("deve travar a numeração do fabrico antes de criar o pedido", async () => {
            prepararCenarioFeliz();

            await service.createCompleto(dtoBase, fabricoId);

            const ordemTrava = mockPrismaService.$executeRaw.mock.invocationCallOrder[0];
            const ordemCriacao = mockPrismaService.pedido.create.mock.invocationCallOrder[0];
            expect(ordemTrava).toBeLessThan(ordemCriacao);
        });

        it("deve aceitar apenas produtos ativos nas fichas novas", async () => {
            prepararCenarioFeliz();

            await service.createCompleto(dtoBase, fabricoId);

            expect(mockPrismaService.produto.findMany).toHaveBeenNthCalledWith(1, {
                where: { id: { in: [5] }, fabrico_id: fabricoId, ativo: true },
                select: { id: true, grade_versao_id: true },
            });
        });

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
                    fabricoId,
                ),
            ).rejects.toThrow(
                "Não é permitido mais de uma ficha técnica do mesmo produto no pedido",
            );
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.create).not.toHaveBeenCalled();
            expect(mockPrismaService.produto.updateMany).not.toHaveBeenCalled();
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
            mockPrismaService.etapa.findFirst
                .mockResolvedValueOnce({ id: 2 })
                .mockResolvedValueOnce({ id: 8 });
            // Consulta por idempotency_key não encontra pedido; consulta de numeração devolve o último.
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

        it("deve criar pedido, ficha e vínculos dentro de uma única transação", async () => {
            prepararCenarioFeliz();

            const resultado = await service.createCompleto(dtoBase, fabricoId);

            expect(resultado).toEqual({ id: 100, numero: 7 });
            expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
            expect(mockPrismaService.$executeRaw).toHaveBeenCalled();

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    fabrico_id: 1,
                    cliente_id: 7,
                    numero: 7,
                    finalizado: false,
                    quantidade: 30,
                    // 30 peças x custo 10 do produto
                    custo_total: toMoney(300),
                    // 30 peças x preço 20 do cliente
                    valor_total: toMoney(600),
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
                    create: { produto_id: 5, parceiro_id: 9, preco: toMoney(4) },
                    update: { preco: toMoney(4) },
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
                    valor: toMoney(120),
                }),
            });

            expect(mockPrismaService.clienteProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        cliente_id: 7,
                        produto_id: 5,
                        nome_para_cliente: "Camisa do cliente",
                        preco_padrao: toMoney(20),
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
                },
                fabricoId,
            );

            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    numero: 1,
                    cliente_id: null,
                    custo_total: toMoney(300),
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
                fabricoId,
            );

            expect(mockPrismaService.parceiroProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: { produto_id: 5, parceiro_id: 9, preco: toMoney("1.01") },
                    update: { preco: toMoney("1.01") },
                }),
            );
            expect(mockPrismaService.clienteProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        preco_padrao: toMoney("1.01"),
                    }),
                }),
            );
            expect(mockPrismaService.fichaParceiro.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    valor: toMoney("3.03"),
                }),
            });
            expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    quantidade: 3,
                    valor_total: toMoney("3.03"),
                }),
            });
        });

        it("deve reutilizar o pedido quando a chave de idempotência já existe", async () => {
            const existente = { id: 100, numero: 7, fichas_tecnicas: [] };
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, grade_versao_id: 3 }]);
            mockPrismaService.pedido.findFirst.mockResolvedValue(existente);

            const resultado = await service.createCompleto(
                { ...dtoBase, idempotency_key: "req-1" },
                fabricoId,
            );

            expect(resultado).toEqual(existente);
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.create).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { fabrico_id: 1, idempotency_key: "req-1" },
                }),
            );
        });

        it("deve devolver o pedido já criado mesmo se o produto foi desativado antes do retry", async () => {
            const existente = { id: 100, numero: 7, fichas_tecnicas: [] };
            // Produto desativado depois da criação: a consulta de produtos ativos voltaria vazia.
            mockPrismaService.produto.findMany.mockResolvedValue([]);
            mockPrismaService.cliente.findFirst.mockResolvedValue(null);
            mockPrismaService.pedido.findFirst.mockResolvedValue(existente);

            const resultado = await service.createCompleto(
                { ...dtoBase, idempotency_key: "req-perdida" },
                fabricoId,
            );

            expect(resultado).toEqual(existente);
            expect(mockPrismaService.produto.findMany).not.toHaveBeenCalled();
            expect(mockPrismaService.cliente.findFirst).not.toHaveBeenCalled();
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
        });

        it("deve devolver o pedido criado se outro request gravar a mesma chave durante a transação", async () => {
            prepararCenarioFeliz();
            const existente = { id: 100, numero: 7 };
            mockPrismaService.pedido.findFirst
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(existente);

            const resultado = await service.createCompleto(
                { ...dtoBase, idempotency_key: "req-2" },
                fabricoId,
            );

            expect(resultado).toEqual(existente);
            expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
            expect(mockPrismaService.pedido.create).not.toHaveBeenCalled();
        });

        it("deve rejeitar produto de outro fabrico antes de abrir a transação", async () => {
            mockPrismaService.produto.findMany.mockResolvedValueOnce([]);

            await expect(
                service.createCompleto(
                    {
                        idempotency_key: "chave-teste",
                        fichas: [
                            {
                                produto_id: 5,
                                quantidade: 1,
                                cores_ids: [1],
                                itens: [{ cor_id: 1, grade_versao_item_id: 11, quantidade: 1 }],
                            },
                        ],
                    },
                    fabricoId,
                ),
            ).rejects.toThrow(NotFoundException);

            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.create).not.toHaveBeenCalled();
        });

        it("deve rejeitar cor que não pertence ao fabrico, sem persistir o pedido", async () => {
            prepararCenarioFeliz();
            mockPrismaService.cor.findMany.mockResolvedValue([]);

            await expect(service.createCompleto(dtoBase, fabricoId)).rejects.toThrow(
                BadRequestException,
            );
        });

        it("deve rejeitar grade não liberada para o fabrico", async () => {
            prepararCenarioFeliz();
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);

            await expect(service.createCompleto(dtoBase, fabricoId)).rejects.toThrow(
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
                        fichas: [{ ...dtoBase.fichas[0], etapa_atual_id: 99 }],
                    },
                    fabricoId,
                ),
            ).rejects.toThrow(
                "Uma ou mais etapas não pertencem ao fabrico do pedido ou estão inativas",
            );
        });

        it("deve rejeitar ficha com quantidade positiva sem matriz no createCompleto", async () => {
            await expect(
                service.createCompleto(
                    {
                        idempotency_key: "chave-teste",
                        fichas: [{ produto_id: 5, quantidade: 30 }],
                    },
                    fabricoId,
                ),
            ).rejects.toThrow(
                "Informe a matriz (itens ou cores_ids) quando a quantidade da ficha for positiva",
            );

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
                    fabricoId,
                ),
            ).rejects.toThrow(
                "A soma das quantidades da matriz deve ser igual à quantidade da ficha técnica",
            );
        });

        it("deve exigir ao menos uma ficha técnica", async () => {
            await expect(service.createCompleto({ fichas: [] }, fabricoId)).rejects.toThrow(
                BadRequestException,
            );
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

        describe("preço de parceiro e custo recalculado", () => {
            let serviceComRecalculo: PedidoService;
            let precoGravado: Prisma.Decimal | null;
            let custoGravado: Prisma.Decimal;

            beforeEach(async () => {
                precoGravado = toMoney(4);
                custoGravado = toMoney(12);

                mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
                mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100 });
                mockPrismaService.produto.findFirst.mockResolvedValue({ id: 5 });
                mockPrismaService.parceiro.findMany.mockResolvedValue([{ id: 9 }]);
                mockPrismaService.etapa.findMany.mockResolvedValue([
                    { id: 2, nome: "Costura", ordem: 1 },
                    { id: 3, nome: "Embalagem", ordem: 2 },
                ]);
                mockPrismaService.produto.findMany.mockImplementation(async () => [
                    { id: 5, custo_total: custoGravado },
                ]);
                mockPrismaService.produto.findUnique.mockImplementation(async () => ({
                    id: 5,
                    fabrico_id: fabricoId,
                    tecido: null,
                    quantidade_tecido: null,
                    custo_tecido: toMoney(6),
                    custo_operacional: toMoney(2),
                    outros_custos: null,
                    produtoAviamentos: [],
                    parceiro_produto: [{ preco: precoGravado, parceiro: { categoria: "Costura" } }],
                }));
                mockPrismaService.parceiroProduto.upsert.mockImplementation(
                    async ({ update }: { update: { preco?: Prisma.Decimal | null } }) => {
                        if (update.preco !== undefined) precoGravado = update.preco;
                        return { produto_id: 5, parceiro_id: 9, preco: precoGravado };
                    },
                );
                mockPrismaService.produto.update.mockImplementation(
                    async ({ data }: { data: { custo_total: Prisma.Decimal } }) => {
                        custoGravado = data.custo_total;
                        return { id: 5, custo_total: custoGravado };
                    },
                );

                const module = await Test.createTestingModule({
                    providers: [
                        PedidoService,
                        ProdutoService,
                        { provide: PrismaService, useValue: mockPrismaService },
                    ],
                }).compile();
                serviceComRecalculo = module.get<PedidoService>(PedidoService);
            });

            const cenarios: {
                descricao: string;
                parceiro: CreatePedidoFichaParceiroDto;
                precoEsperado: number | null;
                custoUnitarioEsperado: number;
                custoPedidoEsperado: number;
            }[] = [
                {
                    descricao: "ausente preserva o preço gravado",
                    parceiro: { parceiro_id: 9 },
                    precoEsperado: 4,
                    custoUnitarioEsperado: 12,
                    custoPedidoEsperado: 360,
                },
                {
                    descricao: "null explícito limpa o preço gravado",
                    parceiro: { parceiro_id: 9, preco: null },
                    precoEsperado: null,
                    custoUnitarioEsperado: 8,
                    custoPedidoEsperado: 240,
                },
                {
                    descricao: "valor informado atualiza o preço gravado",
                    parceiro: { parceiro_id: 9, preco: 7.5 },
                    precoEsperado: 7.5,
                    custoUnitarioEsperado: 15.5,
                    custoPedidoEsperado: 465,
                },
                {
                    descricao: "zero é um valor válido e não mantém o preço anterior",
                    parceiro: { parceiro_id: 9, preco: 0 },
                    precoEsperado: 0,
                    custoUnitarioEsperado: 8,
                    custoPedidoEsperado: 240,
                },
            ];

            it.each(cenarios)(
                "$descricao, recalculando o custo do produto e do pedido",
                async ({ parceiro, precoEsperado, custoUnitarioEsperado, custoPedidoEsperado }) => {
                    await serviceComRecalculo.updateCompleto(
                        100,
                        {
                            fichas: [
                                {
                                    id: 200,
                                    produto_id: 5,
                                    quantidade: 30,
                                    parceiros: [parceiro],
                                },
                            ],
                        },
                        fabricoId,
                    );

                    expect(precoGravado).toEqual(
                        precoEsperado === null ? null : toMoney(precoEsperado),
                    );
                    expect(custoGravado).toEqual(toMoney(custoUnitarioEsperado));
                    expect(mockPrismaService.produto.update).toHaveBeenCalledWith({
                        where: { id: 5 },
                        data: {
                            custo_tecido: toMoney(6),
                            custo_total: toMoney(custoUnitarioEsperado),
                        },
                    });
                    expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                        where: { id: 100 },
                        data: expect.objectContaining({
                            quantidade: 30,
                            custo_total: toMoney(custoPedidoEsperado),
                        }),
                    });
                },
            );
        });

        it("deve rejeitar ficha nova de produto que ja tem ficha no pedido", async () => {
            await expect(
                service.updateCompleto(
                    100,
                    {
                        fichas: [
                            { id: 200, produto_id: 5, quantidade: 30 },
                            { produto_id: 5, quantidade: 0 },
                        ],
                    },
                    fabricoId,
                ),
            ).rejects.toThrow(
                "Não é permitido mais de uma ficha técnica do mesmo produto no pedido",
            );
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.create).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.update).not.toHaveBeenCalled();
        });

        it("deve travar o pedido antes de reler e revalidar a finalização", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                ...pedidoExistente,
                finalizado: true,
            });

            await expect(
                service.updateCompleto(
                    100,
                    { fichas: [{ id: 200, produto_id: 5, quantidade: 30 }] },
                    fabricoId,
                ),
            ).rejects.toThrow(ConflictException);

            const ordemTravaPedido = mockPrismaService.$queryRaw.mock.invocationCallOrder[0];
            const ordemLeitura = mockPrismaService.pedido.findFirst.mock.invocationCallOrder[0];
            expect(ordemTravaPedido).toBeLessThan(ordemLeitura);
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
                },
                fabricoId,
            );

            expect(resultado).toEqual({ id: 100, cliente_id: 8 });
            expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
            expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
            expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.create).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.deleteMany).not.toHaveBeenCalled();

            expect(mockPrismaService.clienteProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        cliente_id: 8,
                        produto_id: 5,
                        nome_para_cliente: "Nova ref",
                        preco_padrao: toMoney(25),
                    }),
                }),
            );

            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: expect.objectContaining({
                    cliente_id: 8,
                    quantidade: 30,
                    custo_total: toMoney(300),
                    valor_total: toMoney(750),
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
                { produto_id: 5, preco_padrao: toMoney(20) },
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
                },
                fabricoId,
            );

            expect(mockPrismaService.fichaTecnica.update).toHaveBeenCalledWith({
                where: { id: 200 },
                data: { quantidade: 30 },
            });
            expect(mockPrismaService.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
            expect(mockPrismaService.clienteProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: {},
                }),
            );
            expect(mockPrismaService.clienteProduto.findMany).toHaveBeenCalledWith({
                where: { cliente_id: 7, produto_id: { in: [5] } },
                select: { produto_id: true, preco_padrao: true },
            });
            // 30 peças x preço persistido 20 (payload omitiu preco_padrao)
            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: expect.objectContaining({
                    quantidade: 30,
                    custo_total: toMoney(300),
                    valor_total: toMoney(600),
                }),
            });
        });

        it("deve recuperar preco_padrao persistido ao editar só a data sem reenviar o preço", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);
            mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 7, fabrico_id: 1 });
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: 5, custo_total: 10 }]);
            mockPrismaService.clienteProduto.findMany.mockResolvedValue([
                { produto_id: 5, preco_padrao: toMoney(25) },
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
                },
                fabricoId,
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
                    custo_total: toMoney(300),
                    valor_total: toMoney(750),
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
                },
                fabricoId,
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
                    valor_total: toMoney(0),
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
                    },
                    fabricoId,
                ),
            ).rejects.toThrow(
                "A soma das quantidades da matriz deve ser igual à quantidade da ficha técnica",
            );
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
                },
                fabricoId,
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
                },
                fabricoId,
            );

            expect(mockPrismaService.etapa.findFirst).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.update).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaEtapa.create).not.toHaveBeenCalled();
        });

        it("deve rejeitar grade_versao_id em ficha existente sem itens ou cores_ids", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoExistente);

            const promessa = service.updateCompleto(
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
                },
                fabricoId,
            );

            await expect(promessa).rejects.toThrow(BadRequestException);
            await expect(promessa).rejects.toThrow(
                "Para alterar a grade da ficha, envie também itens ou cores_ids",
            );

            expect(mockPrismaService.fichaTecnica.update).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnicaItem.createMany).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaParceiro.deleteMany).not.toHaveBeenCalled();
            expect(mockPrismaService.parceiroProduto.upsert).not.toHaveBeenCalled();
            expect(mockPrismaService.clienteProduto.upsert).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.update).not.toHaveBeenCalled();
        });

        it.each([
            ["concluída", { concluida: true, produzida_em: null }],
            ["já produzida", { concluida: false, produzida_em: new Date("2026-09-20T10:00:00Z") }],
        ])("deve recusar com 409 a omissão de ficha %s sem apagar nada", async (_, estado) => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                ...pedidoExistente,
                fichas_tecnicas: [
                    { id: 200, produto_id: 5, quantidade: 30, pedido_id: 100, ...estado },
                    {
                        id: 201,
                        produto_id: 6,
                        quantidade: 10,
                        pedido_id: 100,
                        concluida: false,
                        produzida_em: null,
                    },
                ],
            });

            await expect(
                service.updateCompleto(
                    100,
                    { fichas: [{ id: 201, produto_id: 6, quantidade: 10 }] },
                    fabricoId,
                ),
            ).rejects.toThrow(ConflictException);

            expect(mockPrismaService.fichaEtapa.deleteMany).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.deleteMany).not.toHaveBeenCalled();
            expect(mockPrismaService.pedido.update).not.toHaveBeenCalled();
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
                fabricoId,
            );

            expect(mockPrismaService.fichaEtapa.deleteMany).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.deleteMany).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.updateMany).toHaveBeenCalledWith({
                where: { delete_at: null, id: { in: [200] }, pedido_id: 100 },
                data: { delete_at: expect.any(Date) },
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
                    custo_total: toMoney(80),
                    valor_total: toMoney(150),
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
                fabricoId,
            );

            expect(mockPrismaService.clienteProduto.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        cliente_id: 7,
                        produto_id: 5,
                        nome_para_cliente: "Ref mantida",
                        preco_padrao: toMoney(20),
                    }),
                }),
            );

            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: {
                    quantidade: 30,
                    custo_total: toMoney(300),
                    valor_total: toMoney(600),
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
                fabricoId,
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
                    fabricoId,
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
                    },
                    fabricoId,
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
                    fabricoId,
                ),
            ).rejects.toThrow("Não é permitido alterar o produto da ficha");

            expect(mockPrismaService.parceiroProduto.upsert).not.toHaveBeenCalled();
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
                    },
                    fabricoId,
                ),
            ).rejects.toThrow(NotFoundException);

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
                    },
                    fabricoId,
                ),
            ).rejects.toThrow("Um ou mais produtos não pertencem a este fabrico");

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
                    },
                    fabricoId,
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
                    },
                    fabricoId,
                ),
            ).rejects.toThrow(ConflictException);

            expect(mockPrismaService.pedido.update).not.toHaveBeenCalled();
        });

        it("deve exigir ao menos uma ficha técnica", async () => {
            await expect(service.updateCompleto(100, { fichas: [] }, fabricoId)).rejects.toThrow(
                BadRequestException,
            );
        });

        describe("pedido misto (uma concluída e uma pendente)", () => {
            const itensA = [
                { cor_id: 1, grade_versao_item_id: 11, quantidade: 10 },
                { cor_id: 1, grade_versao_item_id: 12, quantidade: 20 },
            ];

            const pedidoMisto = (overB: Record<string, unknown> = {}) => ({
                id: 100,
                fabrico_id: 1,
                cliente_id: 7,
                finalizado: false,
                fichas_tecnicas: [
                    {
                        id: 200,
                        produto_id: 5,
                        pedido_id: 100,
                        concluida: true,
                        produzida_em: null,
                        quantidade: 30,
                        grade_versao_id: 3,
                        observacoes: null,
                        ficha_tecnica_itens: itensA.map((i, k) => ({ id: k + 1, ...i })),
                        ficha_parceiro: [],
                    },
                    {
                        id: 201,
                        produto_id: 6,
                        pedido_id: 100,
                        concluida: false,
                        produzida_em: null,
                        quantidade: 10,
                        grade_versao_id: 3,
                        observacoes: null,
                        ficha_tecnica_itens: [
                            { id: 9, cor_id: 1, grade_versao_item_id: 11, quantidade: 10 },
                        ],
                        ficha_parceiro: [],
                        ...overB,
                    },
                ],
            });

            const fichaA = (over: Record<string, unknown> = {}) => ({
                id: 200,
                produto_id: 5,
                quantidade: 30,
                cores_ids: [1],
                itens: itensA,
                ...over,
            });
            const fichaB = (over: Record<string, unknown> = {}) => ({
                id: 201,
                produto_id: 6,
                quantidade: 10,
                cores_ids: [1],
                itens: [
                    { cor_id: 1, grade_versao_item_id: 11, quantidade: 4 },
                    { cor_id: 1, grade_versao_item_id: 12, quantidade: 6 },
                ],
                ...over,
            });

            const preparar = (pedido: unknown = pedidoMisto()) => {
                mockPrismaService.pedido.findFirst.mockResolvedValue(pedido);
                mockPrismaService.produto.findMany.mockResolvedValue([
                    { id: 5, custo_total: 10 },
                    { id: 6, custo_total: 8 },
                ]);
                mockPrismaService.cor.findMany.mockResolvedValue([{ id: 1 }]);
                mockPrismaService.gradeVersaoItem.findMany.mockResolvedValue([
                    { id: 11 },
                    { id: 12 },
                ]);
                mockPrismaService.fichaTecnicaItem.aggregate.mockResolvedValue({
                    _sum: { quantidade: 10 },
                    _count: { _all: 1 },
                });
                mockPrismaService.pedido.findUnique.mockResolvedValue({ id: 100 });
            };

            const nenhumaEscritaNaConcluida = () => {
                expect(mockPrismaService.fichaTecnicaItem.deleteMany).not.toHaveBeenCalledWith({
                    where: { ficha_tecnica_id: 200 },
                });
                expect(mockPrismaService.fichaTecnica.update).not.toHaveBeenCalledWith(
                    expect.objectContaining({ where: { id: 200 } }),
                );
                expect(mockPrismaService.fichaParceiro.deleteMany).not.toHaveBeenCalledWith({
                    where: { ficha_id: 200 },
                });
            };

            it("alterar a pendente passa e grava só nela", async () => {
                preparar();

                await service.updateCompleto(100, { fichas: [fichaA(), fichaB()] }, fabricoId);

                expect(mockPrismaService.fichaTecnicaItem.deleteMany).toHaveBeenCalledTimes(1);
                expect(mockPrismaService.fichaTecnicaItem.deleteMany).toHaveBeenCalledWith({
                    where: { ficha_tecnica_id: 201 },
                });
                expect(mockPrismaService.fichaTecnicaItem.createMany).toHaveBeenCalledTimes(1);
                nenhumaEscritaNaConcluida();
            });

            it("alterar a concluída dá 409 sem gravar nada (nem na pendente)", async () => {
                preparar();
                const alterada = fichaA({
                    itens: [
                        { cor_id: 1, grade_versao_item_id: 11, quantidade: 9 },
                        { cor_id: 1, grade_versao_item_id: 12, quantidade: 21 },
                    ],
                });

                await expect(
                    service.updateCompleto(100, { fichas: [alterada, fichaB()] }, fabricoId),
                ).rejects.toThrow(ConflictException);

                expect(mockPrismaService.fichaTecnicaItem.deleteMany).not.toHaveBeenCalled();
                expect(mockPrismaService.fichaTecnicaItem.createMany).not.toHaveBeenCalled();
                expect(mockPrismaService.fichaTecnica.update).not.toHaveBeenCalled();
                expect(mockPrismaService.fichaParceiro.deleteMany).not.toHaveBeenCalled();
                expect(mockPrismaService.parceiroProduto.upsert).not.toHaveBeenCalled();
                expect(mockPrismaService.clienteProduto.upsert).not.toHaveBeenCalled();
                expect(mockPrismaService.pedido.update).not.toHaveBeenCalled();
            });

            it.each([
                [
                    "quantidade",
                    {
                        quantidade: 31,
                        itens: [
                            { cor_id: 1, grade_versao_item_id: 11, quantidade: 10 },
                            { cor_id: 1, grade_versao_item_id: 12, quantidade: 21 },
                        ],
                    },
                ],
                ["observações", { observacoes: "x" }],
                ["preço padrão", { preco_padrao: 99 }],
                ["parceiro novo", { parceiros: [{ parceiro_id: 9, operacao: null, preco: 4 }] }],
            ])("alterar %s da concluída dá 409", async (_nome, over) => {
                preparar();
                // itens/quantidade consistentes para chegar à validação do helper
                const payload = fichaA(
                    "quantidade" in over
                        ? { ...over, itens: undefined, cores_ids: undefined }
                        : over,
                );

                await expect(
                    service.updateCompleto(100, { fichas: [payload, fichaB()] }, fabricoId),
                ).rejects.toThrow(ConflictException);
                expect(mockPrismaService.pedido.update).not.toHaveBeenCalled();
            });

            it("reenviar a concluída idêntica passa sem regravar nada dela", async () => {
                preparar();
                const bIgual = { id: 201, produto_id: 6, quantidade: 10 };

                await service.updateCompleto(100, { fichas: [fichaA(), bIgual] }, fabricoId);

                nenhumaEscritaNaConcluida();
                expect(mockPrismaService.fichaTecnicaItem.createMany).not.toHaveBeenCalled();
                expect(mockPrismaService.parceiroProduto.upsert).not.toHaveBeenCalled();
                expect(mockPrismaService.pedido.update).toHaveBeenCalledTimes(1);
            });

            it("eco com células zeradas omitidas e observacoes null também passa", async () => {
                preparar();
                const bIgual = { id: 201, produto_id: 6, quantidade: 10 };

                await expect(
                    service.updateCompleto(
                        100,
                        { fichas: [fichaA({ observacoes: null }), bIgual] },
                        fabricoId,
                    ),
                ).resolves.toBeDefined();
                nenhumaEscritaNaConcluida();
            });

            it("ficha na última etapa (produzida_em) ainda não concluída continua editável", async () => {
                preparar(pedidoMisto({ produzida_em: new Date("2026-10-20T10:00:00Z") }));

                await service.updateCompleto(100, { fichas: [fichaA(), fichaB()] }, fabricoId);

                expect(mockPrismaService.fichaTecnicaItem.deleteMany).toHaveBeenCalledWith({
                    where: { ficha_tecnica_id: 201 },
                });
                nenhumaEscritaNaConcluida();
            });

            it("omitir a ficha concluída dá 409 sem apagar nada", async () => {
                preparar();

                await expect(
                    service.updateCompleto(100, { fichas: [fichaB()] }, fabricoId),
                ).rejects.toThrow(ConflictException);
                expect(mockPrismaService.fichaTecnica.deleteMany).not.toHaveBeenCalled();
                expect(mockPrismaService.fichaEtapa.deleteMany).not.toHaveBeenCalled();
            });
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

            const result = await service.findAll(fabricoId);

            expect(result).toEqual(pedidos);

            expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith({
                where: { delete_at: null, fabrico_id: 1 },
                include: {
                    cliente: true,
                    fichas_tecnicas: {
                        where: { delete_at: null },
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

            const result = await service.getById(1, fabricoId);

            expect(result).toEqual(pedido);
            expect(mockPrismaService.pedido.findFirst).toHaveBeenCalledWith({
                where: { delete_at: null, id: 1, fabrico_id: 1 },
                include: {
                    cliente: true,
                    fichas_tecnicas: {
                        where: { delete_at: null },
                        include: { fichas_etapas: true },
                    },
                },
            });
        });

        it("deve devolver também as fichas concluídas do pedido", async () => {
            const pedido = {
                id: 1,
                fabrico_id: 1,
                finalizado: false,
                fichas_tecnicas: [
                    { id: 10, concluida: true },
                    { id: 11, concluida: false },
                ],
            };
            mockPrismaService.pedido.findFirst.mockResolvedValue(pedido);

            const result = await service.getById(1, fabricoId);

            expect(result.fichas_tecnicas.map((ficha) => ficha.id)).toEqual([10, 11]);
            const args = mockPrismaService.pedido.findFirst.mock.calls[0][0];
            expect(JSON.stringify(args)).not.toContain("concluida");
        });

        it("deve lançar NotFoundException se pedido não existir no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(null);

            await expect(service.getById(1, fabricoId)).rejects.toThrow(NotFoundException);
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

            const result = await service.findAllCliente(7, fabricoId);

            expect(result).toEqual(pedidos);

            expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith({
                where: { delete_at: null, cliente_id: 7, fabrico_id: 1 },
            });
        });
    });

    describe("update", () => {
        describe("campos opcionais", () => {
            beforeEach(() => {
                mockPrismaService.pedido.findFirst.mockResolvedValue({
                    id: 1,
                    fabrico_id: fabricoId,
                    finalizado: false,
                    data_prevista: new Date("2026-10-20T00:00:00.000Z"),
                    observacoes: "Observação existente",
                    cliente_id: 7,
                });
            });

            it("deve preservar campos omitidos ao atualizar somente o custo", async () => {
                await service.update(1, { custo_total: 140.75 }, fabricoId);

                expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                    where: { id: 1 },
                    data: expect.objectContaining({
                        data_prevista: undefined,
                        observacoes: undefined,
                        cliente_id: undefined,
                        custo_total: toMoney(140.75),
                    }),
                });
                expect(mockPrismaService.cliente.findFirst).not.toHaveBeenCalled();
            });

            it("deve aceitar null explícito no DTO e limpar os campos", async () => {
                const dto = plainToInstance(UpdatePedidoDto, {
                    data_prevista: null,
                    observacoes: null,
                    cliente_id: null,
                });

                expect(await validate(dto)).toEqual([]);

                await service.update(1, dto, fabricoId);

                expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                    where: { id: 1 },
                    data: expect.objectContaining({
                        data_prevista: null,
                        observacoes: null,
                        cliente_id: null,
                    }),
                });
                expect(mockPrismaService.cliente.findFirst).not.toHaveBeenCalled();
            });

            it("deve atualizar os campos preenchidos e validar o cliente no fabrico", async () => {
                mockPrismaService.cliente.findFirst.mockResolvedValue({
                    id: 8,
                    fabrico_id: fabricoId,
                });

                await service.update(
                    1,
                    {
                        data_prevista: "2026-10-25T00:00:00.000Z",
                        observacoes: "Observação atualizada",
                        cliente_id: 8,
                    },
                    fabricoId,
                );

                expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
                    where: { id: 8, fabrico_id: fabricoId },
                });
                expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                    where: { id: 1 },
                    data: expect.objectContaining({
                        data_prevista: new Date("2026-10-25T00:00:00.000Z"),
                        observacoes: "Observação atualizada",
                        cliente_id: 8,
                    }),
                });
            });
        });

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
                fabricoId,
            );

            expect(result).toEqual(pedidoAtualizado);

            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    custo_total: toMoney(140.75),
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
                    fabricoId,
                ),
            ).rejects.toThrow(ConflictException);

            expect(mockPrismaService.pedido.update).not.toHaveBeenCalled();
        });

        it("deve travar o pedido antes de reler e revalidar a finalização no update", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                id: 1,
                fabrico_id: 1,
                finalizado: true,
            });

            await expect(service.update(1, { observacoes: "x" }, fabricoId)).rejects.toThrow(
                ConflictException,
            );

            const ordemTrava = mockPrismaService.$queryRaw.mock.invocationCallOrder[0];
            const ordemLeitura = mockPrismaService.pedido.findFirst.mock.invocationCallOrder[0];
            expect(ordemTrava).toBeLessThan(ordemLeitura);
            expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
        });

        it("deve lançar erro se pedido não existir no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(null);

            await expect(
                service.update(
                    1,
                    {
                        observacoes: "x",
                    },
                    fabricoId,
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
                    fabricoId,
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

            const result = await service.delete(1, fabricoId);

            expect(result).toEqual("O pedido com o id 1 foi deletado com sucesso");

            expect(mockPrismaService.pedido.delete).not.toHaveBeenCalled();
            expect(mockPrismaService.fichaTecnica.updateMany).toHaveBeenCalledWith({
                where: { pedido_id: 1, fabrico_id: 1, delete_at: null },
                data: { delete_at: expect.any(Date) },
            });
            const exclusao =
                mockPrismaService.fichaTecnica.updateMany.mock.calls[0][0].data.delete_at;
            expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { delete_at: exclusao },
            });
        });

        it("deve rejeitar exclusão de pedido finalizado", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                id: 1,
                fabrico_id: 1,
                finalizado: true,
            });

            await expect(service.delete(1, fabricoId)).rejects.toThrow(ConflictException);
            expect(mockPrismaService.pedido.delete).not.toHaveBeenCalled();
        });

        it("deve travar o pedido antes de reler e revalidar a finalização no delete", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue({
                id: 1,
                fabrico_id: 1,
                finalizado: true,
            });

            await expect(service.delete(1, fabricoId)).rejects.toThrow(ConflictException);

            const ordemTrava = mockPrismaService.$queryRaw.mock.invocationCallOrder[0];
            const ordemLeitura = mockPrismaService.pedido.findFirst.mock.invocationCallOrder[0];
            expect(ordemTrava).toBeLessThan(ordemLeitura);
            expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
        });

        it("deve lançar erro se pedido não existir no fabrico", async () => {
            mockPrismaService.pedido.findFirst.mockResolvedValue(null);

            await expect(service.delete(1, fabricoId)).rejects.toThrow(NotFoundException);
        });
    });
});
