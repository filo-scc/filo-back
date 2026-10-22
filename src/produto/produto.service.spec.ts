import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ProdutoService } from "./produto.service";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

const { PrismaClientKnownRequestError } = Prisma;

describe("ProdutoService", () => {
    let service: ProdutoService;
    let prisma: any;

    const mockUser: AuthenticatedUser = {
        id: 1,
        cargo: "PROPRIETARIO",
        fabrico_id: 10,
    } as AuthenticatedUser;

    const mockUserSemFabrico: AuthenticatedUser = {
        id: 2,
        cargo: "PROPRIETARIO",
    } as AuthenticatedUser;

    beforeEach(() => {
        prisma = {
            $transaction: jest.fn((cb) =>
                typeof cb === "function" ? cb(prisma) : Promise.all(cb),
            ),
            $queryRaw: jest.fn().mockResolvedValue([]),
            produto: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
                delete: jest.fn(),
            },
            tipoProduto: {
                findFirst: jest.fn().mockResolvedValue({ id: 1 }),
            },
            tecido: {
                findFirst: jest.fn().mockResolvedValue({ id: 1 }),
            },
            etapa: {
                findMany: jest.fn(),
            },
        };
        service = new ProdutoService(prisma);
    });

    describe("getFabricoId & assertFabricoImutavel", () => {
        it("rejeita operação se usuário não possuir fabrico_id", async () => {
            await expect(service.findAll(mockUserSemFabrico)).rejects.toThrow(
                new BadRequestException("Usuário não possui um fabrico associado"),
            );
        });

        it("rejeita alteração do fabrico_id informado no DTO", async () => {
            const dto = { nome: "Camiseta", fabrico_id: 99 };
            await expect(service.create(dto as any, mockUser)).rejects.toThrow(
                new BadRequestException("Não é permitido alterar o fabrico do produto"),
            );
        });
    });

    describe("create", () => {
        it("cria produto com sucesso associando ao fabrico do usuário", async () => {
            prisma.produto.create.mockResolvedValue({ id: 1, nome: "Camiseta", fabrico_id: 10 });

            const dto = { nome: "Camiseta" };
            const res = await service.create(dto as any, mockUser);

            expect(res).toEqual({ id: 1, nome: "Camiseta", fabrico_id: 10 });
            expect(prisma.produto.create).toHaveBeenCalledWith({
                data: { nome: "Camiseta", fabrico_id: 10 },
            });
        });

        it("rejeita versão de grade inexistente, inativa ou não liberada com a mesma resposta", async () => {
            prisma.$queryRaw.mockResolvedValue([]);

            const dto = { nome: "Camiseta", tipo_produto_id: 1, grade_versao_id: 5 };
            await expect(service.create(dto as any, mockUser)).rejects.toThrow(
                new BadRequestException("Versão de grade inválida ou não liberada para o fabrico"),
            );
            expect(prisma.produto.create).not.toHaveBeenCalled();
        });

        it("valida a liberação da grade via FabricoGrade do fabrico do usuário", async () => {
            prisma.$queryRaw.mockResolvedValueOnce([{ id: 5 }]);
            prisma.produto.create.mockResolvedValue({ id: 1 });

            await service.create(
                { nome: "Camiseta", tipo_produto_id: 1, grade_versao_id: 5 } as any,
                mockUser,
            );

            const consulta = prisma.$queryRaw.mock.calls[0][0];
            expect(consulta.sql).toContain('"fabrico_grades"');
            expect(consulta.sql).toContain("FOR SHARE");
            expect(consulta.values).toEqual([5, 10]);
            expect(prisma.produto.create).toHaveBeenCalledWith({
                data: { nome: "Camiseta", tipo_produto_id: 1, grade_versao_id: 5, fabrico_id: 10 },
            });
        });

        it("valida relações e cria o produto na mesma transação", async () => {
            prisma.produto.create.mockResolvedValue({ id: 1 });

            await service.create({ nome: "Camiseta", tipo_produto_id: 1 } as any, mockUser);

            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(prisma.tipoProduto.findFirst).toHaveBeenCalled();
            expect(prisma.produto.create).toHaveBeenCalled();
        });

        it("não valida relações opcionais omitidas", async () => {
            prisma.produto.create.mockResolvedValue({ id: 1 });

            await service.create({ nome: "Camiseta", tipo_produto_id: 1 } as any, mockUser);

            expect(prisma.tecido.findFirst).not.toHaveBeenCalled();
            expect(prisma.$queryRaw).not.toHaveBeenCalled();
        });

        it("traduz erro P2002 do Prisma no create", async () => {
            prisma.produto.create.mockRejectedValue(
                new PrismaClientKnownRequestError("duplicado", {
                    code: "P2002",
                    clientVersion: "5.0.0",
                }),
            );

            await expect(service.create({ nome: "Camiseta" } as any, mockUser)).rejects.toThrow(
                new ConflictException("Já existe um produto com este nome para este fabrico"),
            );
        });

        it("traduz erro P2003 do Prisma no create", async () => {
            prisma.produto.create.mockRejectedValue(
                new PrismaClientKnownRequestError("fk", {
                    code: "P2003",
                    clientVersion: "5.0.0",
                }),
            );

            await expect(service.create({ nome: "Camiseta" } as any, mockUser)).rejects.toThrow(
                new NotFoundException("Relacionamento inválido"),
            );
        });

        it("valida tipo de produto e tecido no fabrico do usuário", async () => {
            prisma.produto.create.mockResolvedValue({ id: 1 });

            await service.create(
                { nome: "Camiseta", tipo_produto_id: 3, tecido_id: 4 } as any,
                mockUser,
            );

            expect(prisma.tipoProduto.findFirst).toHaveBeenCalledWith({
                where: { id: 3, fabrico_id: 10 },
                select: { id: true },
            });
            expect(prisma.tecido.findFirst).toHaveBeenCalledWith({
                where: { id: 4, fabrico_id: 10 },
                select: { id: true },
            });
        });

        it("rejeita tipo de produto de outro fabrico", async () => {
            prisma.tipoProduto.findFirst.mockResolvedValue(null);

            await expect(
                service.create({ nome: "Camiseta", tipo_produto_id: 3 } as any, mockUser),
            ).rejects.toThrow(new BadRequestException("Tipo de produto inválido"));
            expect(prisma.produto.create).not.toHaveBeenCalled();
        });

        it("rejeita tecido de outro fabrico", async () => {
            prisma.tecido.findFirst.mockResolvedValue(null);

            await expect(
                service.create(
                    { nome: "Camiseta", tipo_produto_id: 3, tecido_id: 4 } as any,
                    mockUser,
                ),
            ).rejects.toThrow(new BadRequestException("Tecido inválido"));
            expect(prisma.produto.create).not.toHaveBeenCalled();
        });
    });

    describe("findAll & findAllFabrico", () => {
        it("lista produtos do fabrico do usuário", async () => {
            prisma.produto.findMany.mockResolvedValue([{ id: 1, nome: "Camiseta" }]);

            const res = await service.findAll(mockUser);
            expect(res).toEqual([{ id: 1, nome: "Camiseta" }]);
            expect(prisma.produto.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 10, ativo: true },
                orderBy: { nome: "asc" },
            });
        });

        it("lista produtos com inclusão de tecido no findAllFabrico", async () => {
            prisma.produto.findMany.mockResolvedValue([{ id: 1, nome: "Camiseta", tecido: {} }]);

            const res = await service.findAllFabrico(mockUser);
            expect(res).toEqual([{ id: 1, nome: "Camiseta", tecido: {} }]);
            expect(prisma.produto.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 10, ativo: true },
                include: { tecido: true },
                orderBy: { nome: "asc" },
            });
        });
    });

    describe("getById", () => {
        it("retorna produto inativo por ID para preservar acesso ao histórico", async () => {
            const produto = {
                id: 1,
                nome: "Camiseta",
                fabrico_id: 10,
                ativo: false,
                fabrico: { fabricacao_sob_demanda: false },
            };
            prisma.produto.findFirst.mockResolvedValue(produto);

            const res = await service.getById(1, mockUser);
            expect(prisma.produto.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    fabrico_id: 10,
                },
                include: {
                    tecido: true,
                    fabrico: {
                        select: {
                            fabricacao_sob_demanda: true,
                        },
                    },
                },
            });
            expect(res).toEqual(produto);
        });

        it("não encontra produto inativo quando a operação exige produto ativo", async () => {
            prisma.produto.findFirst.mockResolvedValue(null);

            await expect(service.getActiveById(1, mockUser)).rejects.toThrow(
                new NotFoundException("Produto não encontrado"),
            );
            expect(prisma.produto.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: 10, ativo: true },
                include: {
                    tecido: true,
                    fabrico: {
                        select: {
                            fabricacao_sob_demanda: true,
                        },
                    },
                },
            });
        });

        it("ignora campos de ciclo de vida mesmo em chamada direta ao service", async () => {
            prisma.produto.create.mockResolvedValue({ id: 1, nome: "Camiseta", fabrico_id: 10 });

            await service.create(
                {
                    nome: "Camiseta",
                    tipo_produto_id: 1,
                    ativo: false,
                    delete_at: new Date(),
                } as any,
                mockUser,
            );

            expect(prisma.produto.create).toHaveBeenCalledWith({
                data: { nome: "Camiseta", tipo_produto_id: 1, fabrico_id: 10 },
            });
        });

        it("lança NotFoundException se produto não for encontrado", async () => {
            prisma.produto.findFirst.mockResolvedValue(null);

            await expect(service.getById(1, mockUser)).rejects.toThrow(
                new NotFoundException("Produto não encontrado"),
            );
        });
    });

    describe("update", () => {
        const mockProdutoBloqueado = () => prisma.$queryRaw.mockResolvedValueOnce([{ id: 1 }]);

        it("atualiza produto sem recalcular custo quando nenhum campo de custo muda", async () => {
            mockProdutoBloqueado();
            prisma.produto.update.mockResolvedValue({ id: 1, nome: "Camiseta Polo" });

            const res = await service.update(1, { nome: "Camiseta Polo" }, mockUser);

            expect(res).toBe("O produto com o id 1 foi atualizado");
            expect(prisma.produto.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { nome: "Camiseta Polo", fabrico_id: 10 },
            });
            expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
        });

        it("bloqueia o produto ativo do fabrico do usuário dentro da transação", async () => {
            mockProdutoBloqueado();
            prisma.produto.update.mockResolvedValue({});

            await service.update(1, { nome: "Camiseta Polo" }, mockUser);

            const consulta = prisma.$queryRaw.mock.calls[0][0];
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(consulta.sql).toContain('"produtos"');
            expect(consulta.sql).toContain("FOR UPDATE");
            expect(consulta.values).toEqual([1, 10]);
        });

        it("não revela produto inativo, inexistente ou de outro fabrico e não valida relações", async () => {
            prisma.$queryRaw.mockResolvedValueOnce([]);

            await expect(
                service.update(1, { tipo_produto_id: 3, grade_versao_id: 5 }, mockUser),
            ).rejects.toThrow(new NotFoundException("Produto não encontrado"));
            expect(prisma.tipoProduto.findFirst).not.toHaveBeenCalled();
            expect(prisma.produto.update).not.toHaveBeenCalled();
        });

        it("rejeita troca para tecido de outro fabrico no update", async () => {
            mockProdutoBloqueado();
            prisma.tecido.findFirst.mockResolvedValue(null);

            await expect(service.update(1, { tecido_id: 4 }, mockUser)).rejects.toThrow(
                new BadRequestException("Tecido inválido"),
            );
            expect(prisma.produto.update).not.toHaveBeenCalled();
        });

        it("rejeita troca para tipo de produto de outro fabrico no update", async () => {
            mockProdutoBloqueado();
            prisma.tipoProduto.findFirst.mockResolvedValue(null);

            await expect(service.update(1, { tipo_produto_id: 3 }, mockUser)).rejects.toThrow(
                new BadRequestException("Tipo de produto inválido"),
            );
            expect(prisma.tipoProduto.findFirst).toHaveBeenCalledWith({
                where: { id: 3, fabrico_id: 10 },
                select: { id: true },
            });
            expect(prisma.produto.update).not.toHaveBeenCalled();
        });

        it("rejeita remoção do tipo de produto obrigatório", async () => {
            mockProdutoBloqueado();

            await expect(
                service.update(1, { tipo_produto_id: null } as any, mockUser),
            ).rejects.toThrow(new BadRequestException("Tipo de produto inválido"));
            expect(prisma.tipoProduto.findFirst).not.toHaveBeenCalled();
            expect(prisma.produto.update).not.toHaveBeenCalled();
        });

        it("rejeita troca para versão de grade não liberada para o fabrico", async () => {
            mockProdutoBloqueado();
            prisma.$queryRaw.mockResolvedValueOnce([]);

            await expect(service.update(1, { grade_versao_id: 7 }, mockUser)).rejects.toThrow(
                new BadRequestException("Versão de grade inválida ou não liberada para o fabrico"),
            );
            expect(prisma.$queryRaw.mock.calls[1][0].values).toEqual([7, 10]);
            expect(prisma.produto.update).not.toHaveBeenCalled();
        });

        it("aceita troca para versão de grade liberada para o fabrico", async () => {
            mockProdutoBloqueado();
            prisma.$queryRaw.mockResolvedValueOnce([{ id: 7 }]);
            prisma.produto.update.mockResolvedValue({});

            await service.update(1, { grade_versao_id: 7 }, mockUser);

            expect(prisma.produto.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { grade_versao_id: 7, fabrico_id: 10 },
            });
        });

        it("remove a versão de grade com null sem consultar liberação", async () => {
            mockProdutoBloqueado();
            prisma.produto.update.mockResolvedValue({});

            await service.update(1, { grade_versao_id: null } as any, mockUser);

            expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
            expect(prisma.produto.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { grade_versao_id: null, fabrico_id: 10 },
            });
        });

        it("não permite reativar produto nem alterar delete_at pelo payload comum", async () => {
            mockProdutoBloqueado();
            prisma.produto.update.mockResolvedValue({ id: 1, nome: "Camiseta Polo" });

            await service.update(
                1,
                { nome: "Camiseta Polo", ativo: true, delete_at: null } as any,
                mockUser,
            );

            expect(prisma.produto.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { nome: "Camiseta Polo", fabrico_id: 10 },
            });
        });

        it("executa transação e recálculo quando altera campos referentes a custo", async () => {
            mockProdutoBloqueado();
            prisma.produto.findUnique.mockResolvedValue({
                id: 1,
                fabrico_id: 10,
                quantidade_tecido: 2,
                custo_operacional: 0,
                outros_custos: 0,
                tecido: { custo_unitario: 10 },
                produtoAviamentos: [],
                parceiro_produto: [],
            });
            prisma.etapa.findMany.mockResolvedValue([]);
            prisma.produto.update.mockResolvedValue({});

            const res = await service.update(1, { custo_tecido: 20 }, mockUser);

            expect(res).toBe("O produto com o id 1 foi atualizado");
            expect(prisma.$transaction).toHaveBeenCalled();
        });
    });

    describe("softDelete", () => {
        it("desativa produto existente sem removê-lo permanentemente", async () => {
            prisma.produto.updateMany.mockResolvedValue({ count: 1 });

            const res = await service.softDelete(1, mockUser);

            expect(res).toBe("O produto com o id 1 foi desativado com sucesso");
            expect(prisma.produto.updateMany).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: 10, ativo: true },
                data: { ativo: false, delete_at: expect.any(Date) },
            });
            expect(prisma.produto.delete).not.toHaveBeenCalled();
        });

        it("não desativa novamente produto inativo ou inacessível", async () => {
            prisma.produto.updateMany.mockResolvedValue({ count: 0 });

            await expect(service.softDelete(1, mockUser)).rejects.toThrow(
                new NotFoundException("Produto não encontrado"),
            );
        });
    });

    describe("restore", () => {
        it("restaura atomicamente apenas produto inativo do próprio fabrico", async () => {
            prisma.produto.updateMany.mockResolvedValue({ count: 1 });

            await expect(service.restore(1, mockUser)).resolves.toBe(
                "O produto com o id 1 foi restaurado com sucesso",
            );
            expect(prisma.produto.updateMany).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: 10, ativo: false },
                data: { ativo: true, delete_at: null },
            });
        });

        it("não revela se o produto está ativo, inexiste ou pertence a outro fabrico", async () => {
            prisma.produto.updateMany.mockResolvedValue({ count: 0 });

            await expect(service.restore(1, mockUser)).rejects.toThrow(
                new NotFoundException("Produto não encontrado"),
            );
        });
    });

    describe("getUnassociatedProductsForClient", () => {
        it("busca produtos não associados ao cliente", async () => {
            prisma.produto.findMany.mockResolvedValue([{ id: 1, nome: "Shorts" }]);

            const res = await service.getUnassociatedProductsForClient(5, mockUser);
            expect(res).toEqual([{ id: 1, nome: "Shorts" }]);
            expect(prisma.produto.findMany).toHaveBeenCalledWith({
                where: {
                    fabrico_id: 10,
                    ativo: true,
                    cliente_produto: { none: { cliente_id: 5 } },
                },
                orderBy: { nome: "asc" },
            });
        });
    });

    describe("recalcularCustoTotal", () => {
        const stubEtapas = [
            { id: 1, nome: "Corte", ordem: 1 },
            { id: 2, nome: "Costura", ordem: 2 },
        ];

        function expectMoneyUpdate(custoTecido: string, custoTotal: string) {
            const update = prisma.produto.update.mock.calls[0][0];
            expect(update.where).toEqual({ id: 1 });
            expect(update.data.custo_tecido.toString()).toBe(custoTecido);
            expect(update.data.custo_total.toString()).toBe(custoTotal);
        }

        it("calcula e atualiza custo total somando tecidos, etapas e aviamentos", async () => {
            prisma.$queryRaw.mockResolvedValue([]);
            prisma.produto.findUnique.mockResolvedValue({
                id: 1,
                fabrico_id: 10,
                quantidade_tecido: 2,
                custo_operacional: 5,
                outros_custos: 3,
                tecido: { custo_unitario: 10 },
                produtoAviamentos: [
                    { custo: 4 },
                    { quantidade: 2, aviamento: { custo_unitario: 3 } },
                ],
                parceiro_produto: [
                    { preco: 10, parceiro: { etapa_id: 1 } },
                    { preco: 20, parceiro: { etapa_id: 1 } },
                ],
            });
            prisma.etapa.findMany.mockResolvedValue(stubEtapas);
            prisma.produto.update.mockResolvedValue({});

            const total = await service.recalcularCustoTotal(1, prisma);

            expect(total).toBe(53);
            expectMoneyUpdate("20", "53");
        });

        describe("vínculo do parceiro com a etapa", () => {
            function produtoComParceiros(parceiros: Array<{ preco: number; parceiro: object }>) {
                return {
                    id: 1,
                    fabrico_id: 10,
                    quantidade_tecido: null,
                    custo_tecido: null,
                    custo_operacional: 0,
                    outros_custos: 0,
                    tecido: null,
                    produtoAviamentos: [],
                    parceiro_produto: parceiros,
                };
            }

            it("renomear a etapa não altera o custo do produto", async () => {
                const parceiros = [{ preco: 10, parceiro: { etapa_id: 1, categoria: "Corte" } }];
                prisma.$queryRaw.mockResolvedValue([]);
                prisma.produto.findUnique.mockResolvedValue(produtoComParceiros(parceiros));
                prisma.produto.update.mockResolvedValue({});

                prisma.etapa.findMany.mockResolvedValue(stubEtapas);
                const antes = await service.recalcularCustoTotal(1, prisma);

                prisma.etapa.findMany.mockResolvedValue([
                    { id: 1, nome: "Corte e Risco", ordem: 1 },
                    { id: 2, nome: "Costura", ordem: 2 },
                ]);
                const depois = await service.recalcularCustoTotal(1, prisma);

                expect(antes).toBe(10);
                expect(depois).toBe(antes);
            });

            it("parceiro sem etapa_id não entra no custo, mesmo com categoria igual ao nome", async () => {
                prisma.$queryRaw.mockResolvedValue([]);
                prisma.produto.findUnique.mockResolvedValue(
                    produtoComParceiros([
                        { preco: 10, parceiro: { etapa_id: null, categoria: "Corte" } },
                    ]),
                );
                prisma.etapa.findMany.mockResolvedValue(stubEtapas);
                prisma.produto.update.mockResolvedValue({});

                await expect(service.recalcularCustoTotal(1, prisma)).resolves.toBe(0);
            });

            it("parceiro ligado à última etapa ativa não entra no custo", async () => {
                prisma.$queryRaw.mockResolvedValue([]);
                prisma.produto.findUnique.mockResolvedValue(
                    produtoComParceiros([{ preco: 10, parceiro: { etapa_id: 2 } }]),
                );
                prisma.etapa.findMany.mockResolvedValue(stubEtapas);
                prisma.produto.update.mockResolvedValue({});

                await expect(service.recalcularCustoTotal(1, prisma)).resolves.toBe(0);
            });
        });

        it("arredonda média de parceiros 0,10/0,11 para 0,11 com ROUND_HALF_UP", async () => {
            prisma.$queryRaw.mockResolvedValue([]);
            prisma.produto.findUnique.mockResolvedValue({
                id: 1,
                fabrico_id: 10,
                quantidade_tecido: null,
                custo_tecido: null,
                custo_operacional: 0,
                outros_custos: 0,
                tecido: null,
                produtoAviamentos: [],
                parceiro_produto: [
                    { preco: "0.10", parceiro: { etapa_id: 1 } },
                    { preco: "0.11", parceiro: { etapa_id: 1 } },
                ],
            });
            prisma.etapa.findMany.mockResolvedValue(stubEtapas);
            prisma.produto.update.mockResolvedValue({});

            const total = await service.recalcularCustoTotal(1, prisma);

            expect(total).toBe(0.11);
            expectMoneyUpdate("0", "0.11");
        });

        it("arredonda componente 0,105 para 0,11 com ROUND_HALF_UP", async () => {
            prisma.$queryRaw.mockResolvedValue([]);
            prisma.produto.findUnique.mockResolvedValue({
                id: 1,
                fabrico_id: 10,
                quantidade_tecido: null,
                custo_tecido: null,
                custo_operacional: "0.105",
                outros_custos: 0,
                tecido: null,
                produtoAviamentos: [],
                parceiro_produto: [],
            });
            prisma.etapa.findMany.mockResolvedValue(stubEtapas);
            prisma.produto.update.mockResolvedValue({});

            const total = await service.recalcularCustoTotal(1, prisma);

            expect(total).toBe(0.11);
            expectMoneyUpdate("0", "0.11");
        });

        it("preserva precisão com quantidades grandes usando Decimal", async () => {
            prisma.$queryRaw.mockResolvedValue([]);
            prisma.produto.findUnique.mockResolvedValue({
                id: 1,
                fabrico_id: 10,
                quantidade_tecido: "1000000",
                custo_operacional: 0,
                outros_custos: 0,
                tecido: { custo_unitario: "0.11" },
                produtoAviamentos: [
                    { quantidade: "1000000", aviamento: { custo_unitario: "0.105" } },
                ],
                parceiro_produto: [],
            });
            prisma.etapa.findMany.mockResolvedValue(stubEtapas);
            prisma.produto.update.mockResolvedValue({});

            // tecido: 1_000_000 * 0.11 = 110_000
            // aviamento: 1_000_000 * 0.105 = 105_000 → ROUND_HALF_UP na linha
            const total = await service.recalcularCustoTotal(1, prisma);

            expect(total).toBe(215000);
            expectMoneyUpdate("110000", "215000");
        });

        it("lança NotFoundException se o produto não existir no recálculo", async () => {
            prisma.$queryRaw.mockResolvedValue([]);
            prisma.produto.findUnique.mockResolvedValue(null);

            await expect(service.recalcularCustoTotal(1, prisma)).rejects.toThrow(
                new NotFoundException("Produto não encontrado"),
            );
        });
    });
});
