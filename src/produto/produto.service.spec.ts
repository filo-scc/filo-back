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
            $queryRaw: jest.fn(),
            produto: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            gradeVersao: {
                findFirst: jest.fn(),
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

        it("valida versão de grade e lança erro se inativa ou inexistente", async () => {
            prisma.gradeVersao.findFirst.mockResolvedValue(null);

            const dto = { nome: "Camiseta", grade_versao_id: 5 };
            await expect(service.create(dto as any, mockUser)).rejects.toThrow(
                new BadRequestException("Versão de grade inválida ou inativa"),
            );
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
    });

    describe("findAll & findAllFabrico", () => {
        it("lista produtos do fabrico do usuário", async () => {
            prisma.produto.findMany.mockResolvedValue([{ id: 1, nome: "Camiseta" }]);

            const res = await service.findAll(mockUser);
            expect(res).toEqual([{ id: 1, nome: "Camiseta" }]);
            expect(prisma.produto.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 10 },
                orderBy: { nome: "asc" },
            });
        });

        it("lista produtos com inclusão de tecido no findAllFabrico", async () => {
            prisma.produto.findMany.mockResolvedValue([{ id: 1, nome: "Camiseta", tecido: {} }]);

            const res = await service.findAllFabrico(mockUser);
            expect(res).toEqual([{ id: 1, nome: "Camiseta", tecido: {} }]);
            expect(prisma.produto.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 10 },
                include: { tecido: true },
                orderBy: { nome: "asc" },
            });
        });
    });

    describe("getById", () => {
        it("retorna produto com a projeção mínima do fabrico", async () => {
            const produto = {
                id: 1,
                nome: "Camiseta",
                fabrico_id: 10,
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

        it("lança NotFoundException se produto não for encontrado", async () => {
            prisma.produto.findFirst.mockResolvedValue(null);

            await expect(service.getById(1, mockUser)).rejects.toThrow(
                new NotFoundException("Produto não encontrado"),
            );
        });
    });

    describe("update", () => {
        it("atualiza produto sem recalcular custo quando nenhum campo de custo muda", async () => {
            prisma.produto.findFirst.mockResolvedValue({ id: 1, fabrico_id: 10 });
            prisma.produto.update.mockResolvedValue({ id: 1, nome: "Camiseta Polo" });

            const res = await service.update(1, { nome: "Camiseta Polo" }, mockUser);

            expect(res).toBe("O produto com o id 1 foi atualizado");
            expect(prisma.produto.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { nome: "Camiseta Polo", fabrico_id: 10 },
            });
        });

        it("executa transação e recálculo quando altera campos referentes a custo", async () => {
            prisma.produto.findFirst.mockResolvedValue({ id: 1, fabrico_id: 10 });
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

    describe("delete", () => {
        it("deleta produto existente", async () => {
            prisma.produto.findFirst.mockResolvedValue({ id: 1, fabrico_id: 10 });
            prisma.produto.delete.mockResolvedValue({ id: 1 });

            const res = await service.delete(1, mockUser);
            expect(res).toBe("O produto com o id 1 foi deletado com sucesso");
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
                    cliente_produto: { none: { cliente_id: 5 } },
                },
                orderBy: { nome: "asc" },
            });
        });
    });

    describe("recalcularCustoTotal", () => {
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
                    { preco: 10, parceiro: { categoria: "Corte" } },
                    { preco: 20, parceiro: { categoria: "Corte" } },
                ],
            });
            prisma.etapa.findMany.mockResolvedValue([
                { nome: "Corte", ordem: 1 },
                { nome: "Costura", ordem: 2 },
            ]);
            prisma.produto.update.mockResolvedValue({});

            const total = await service.recalcularCustoTotal(1, prisma);

            expect(total).toBe(53);
            expect(prisma.produto.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { custo_tecido: 20, custo_total: 53 },
            });
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
