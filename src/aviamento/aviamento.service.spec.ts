import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AviamentoService } from "./aviamento.service";

const { PrismaClientKnownRequestError } = Prisma;

describe("AviamentoService", () => {
    let service: AviamentoService;
    let prisma: any;
    let produtoService: any;
    const user = { fabrico_id: 10 } as any;

    beforeEach(() => {
        prisma = {
            fabrico: { findUnique: jest.fn() },
            aviamento: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                delete: jest.fn(),
                update: jest.fn(),
            },
            produtoAviamento: {
                findMany: jest.fn().mockResolvedValue([]),
                updateMany: jest.fn(),
            },
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));
        produtoService = {
            bloquearProdutosParaRecalculo: jest.fn().mockResolvedValue(undefined),
            recalcularCustosTotais: jest.fn().mockResolvedValue(undefined),
        };
        service = new AviamentoService(prisma, produtoService);
    });

    describe("create", () => {
        it("cria aviamento para fabrico existente", async () => {
            prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
            prisma.aviamento.create.mockResolvedValue({ id: 1, nome: "botão" });

            await expect(
                service.create(
                    {
                        nome: "botão",
                        fabrico_id: 10,
                        unidade_de_medida: "UNIDADE",
                        custo_unitario: 10,
                    },
                    user,
                ),
            ).resolves.toEqual({
                id: 1,
                nome: "botão",
            });
        });

        it("envia os dados corretamente ao prisma", async () => {
            prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
            prisma.aviamento.create.mockResolvedValue({ id: 1 });

            await service.create(
                {
                    nome: "Linha",
                    fabrico_id: 10,
                    unidade_de_medida: "METRO",
                    custo_unitario: 12.5,
                },
                user,
            );

            expect(prisma.aviamento.create).toHaveBeenCalledWith({
                data: {
                    nome: "Linha",
                    fabrico_id: 10,
                    unidade_de_medida: "METRO",
                    custo_unitario: 12.5,
                },
            });
        });

        it("rejeita fabrico inexistente", async () => {
            prisma.fabrico.findUnique.mockResolvedValue(null);

            await expect(
                service.create(
                    {
                        nome: "botão",
                        fabrico_id: 10,
                        unidade_de_medida: "UNIDADE",
                        custo_unitario: 10,
                    },
                    user,
                ),
            ).rejects.toThrow(new NotFoundException("Fabrico não encontrado!"));

            expect(prisma.aviamento.create).not.toHaveBeenCalled();
        });

        it("traduz nome duplicado ao criar", async () => {
            prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
            prisma.aviamento.create.mockRejectedValue(
                new PrismaClientKnownRequestError("duplicado", {
                    code: "P2002",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(
                service.create(
                    {
                        nome: "botão",
                        fabrico_id: 10,
                        unidade_de_medida: "UNIDADE",
                        custo_unitario: 10,
                    },
                    user,
                ),
            ).rejects.toThrow(
                new ConflictException("Já existe um aviamento com este nome para este fabrico"),
            );
        });

        it("propaga erros inesperados", async () => {
            prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });

            const error = new Error("Erro interno");

            prisma.aviamento.create.mockRejectedValue(error);

            await expect(
                service.create(
                    {
                        nome: "botão",
                        fabrico_id: 10,
                        unidade_de_medida: "UNIDADE",
                        custo_unitario: 10,
                    },
                    user,
                ),
            ).rejects.toBe(error);
        });
    });

    describe("findAll", () => {
        it("lista aviamentos", async () => {
            prisma.aviamento.findMany.mockResolvedValue([{ id: 1 }]);

            await expect(service.findAll(user)).resolves.toEqual([{ id: 1 }]);
        });

        it("chama findMany sem filtros", async () => {
            prisma.aviamento.findMany.mockResolvedValue([]);

            await service.findAll(user);

            expect(prisma.aviamento.findMany).toHaveBeenCalledWith({ where: { fabrico_id: 10 } });
        });
    });

    describe("getById", () => {
        it("busca aviamento existente", async () => {
            prisma.aviamento.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });

            await expect(service.getById(1, user)).resolves.toEqual({ id: 1, fabrico_id: 10 });
        });

        it("consulta o prisma pelo id informado", async () => {
            prisma.aviamento.findUnique.mockResolvedValue({ id: 5, fabrico_id: 10 });

            await service.getById(5, user);

            expect(prisma.aviamento.findUnique).toHaveBeenCalledWith({
                where: { id: 5 },
            });
        });

        it("rejeita aviamento inexistente", async () => {
            prisma.aviamento.findUnique.mockResolvedValue(null);

            await expect(service.getById(1, user)).rejects.toThrow(
                new NotFoundException("Aviamento não encontrado"),
            );
        });
    });

    describe("findAllFabrico", () => {
        it("lista aviamentos por fabrico", async () => {
            prisma.aviamento.findMany.mockResolvedValue([{ id: 1 }]);

            await expect(service.findAllFabrico(10, user)).resolves.toEqual([{ id: 1 }]);

            expect(prisma.aviamento.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 10 },
            });
        });
    });

    describe("delete", () => {
        it("remove aviamento existente", async () => {
            prisma.aviamento.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });
            prisma.aviamento.delete.mockResolvedValue({ id: 1 });

            await expect(service.delete(1, user)).resolves.toBe(
                "O aviamento com o id 1 foi deletado com sucesso",
            );
        });

        it("chama delete com o id correto", async () => {
            prisma.aviamento.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });
            prisma.aviamento.delete.mockResolvedValue({ id: 1 });

            await service.delete(1, user);

            expect(prisma.aviamento.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it("rejeita remoção de aviamento inexistente", async () => {
            prisma.aviamento.findUnique.mockResolvedValue(null);

            await expect(service.delete(1, user)).rejects.toThrow(
                new NotFoundException("Aviamento não encontrado"),
            );

            expect(prisma.aviamento.delete).not.toHaveBeenCalled();
        });
    });

    describe("update", () => {
        it("atualiza aviamento existente", async () => {
            prisma.aviamento.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });

            prisma.aviamento.update.mockResolvedValue({
                id: 1,
                nome: "zíper",
            });

            await expect(
                service.update(
                    1,
                    {
                        nome: "zíper",
                    },
                    user,
                ),
            ).resolves.toEqual({
                id: 1,
                nome: "zíper",
            });
        });

        it("envia os dados corretamente ao prisma", async () => {
            prisma.aviamento.findUnique.mockResolvedValue({
                id: 1,
                fabrico_id: 10,
                custo_unitario: 5,
            });
            prisma.aviamento.update.mockResolvedValue({ id: 1 });

            await service.update(
                1,
                {
                    nome: "Elástico",
                    fabrico_id: 5,
                    unidade_de_medida: "METRO",
                    custo_unitario: 8,
                },
                user,
            );

            expect(prisma.aviamento.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    nome: "Elástico",
                    fabrico_id: 10,
                    unidade_de_medida: "METRO",
                    custo_unitario: 8,
                },
            });
        });

        it("invalida custos positivos persistidos quando o custo unitário muda", async () => {
            prisma.aviamento.findUnique.mockResolvedValue({
                id: 1,
                fabrico_id: 10,
                custo_unitario: 5,
            });
            prisma.produtoAviamento.findMany.mockResolvedValue([
                { id: 10, produto_id: 2, quantidade: 3, custo: 12 },
                { id: 11, produto_id: 3, quantidade: 2, custo: null },
            ]);
            prisma.aviamento.update.mockResolvedValue({ id: 1, custo_unitario: 8 });

            await service.update(1, { custo_unitario: 8 }, user);

            expect(prisma.produtoAviamento.updateMany).toHaveBeenCalledWith({
                where: { id: { in: [10] } },
                data: { custo: null },
            });
            expect(produtoService.recalcularCustosTotais).toHaveBeenCalledWith([2, 3], prisma);
        });

        it("preserva custo zero explícito ao mudar o custo unitário", async () => {
            prisma.aviamento.findUnique.mockResolvedValue({
                id: 1,
                fabrico_id: 10,
                custo_unitario: 5,
            });
            prisma.produtoAviamento.findMany.mockResolvedValue([
                { id: 10, produto_id: 2, quantidade: 3, custo: 0 },
                { id: 11, produto_id: 3, quantidade: 2, custo: null },
            ]);
            prisma.aviamento.update.mockResolvedValue({ id: 1, custo_unitario: 8 });

            await service.update(1, { custo_unitario: 8 }, user);

            expect(prisma.produtoAviamento.updateMany).not.toHaveBeenCalled();
            expect(produtoService.recalcularCustosTotais).toHaveBeenCalledWith([2, 3], prisma);
        });

        it("rejeita atualização de aviamento inexistente", async () => {
            prisma.aviamento.findUnique.mockResolvedValue(null);

            await expect(
                service.update(
                    1,
                    {
                        nome: "zíper",
                    },
                    user,
                ),
            ).rejects.toThrow(new NotFoundException("Aviamento não encontrado"));

            expect(prisma.aviamento.update).not.toHaveBeenCalled();
        });

        it("traduz nome duplicado ao atualizar", async () => {
            prisma.aviamento.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });

            prisma.aviamento.update.mockRejectedValue(
                new PrismaClientKnownRequestError("duplicado", {
                    code: "P2002",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(
                service.update(
                    1,
                    {
                        nome: "botão",
                    },
                    user,
                ),
            ).rejects.toThrow(
                new ConflictException("Já existe um aviamento com este nome para este fabrico"),
            );
        });

        it("propaga erros inesperados", async () => {
            prisma.aviamento.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });

            const error = new Error("Erro interno");

            prisma.aviamento.update.mockRejectedValue(error);

            await expect(
                service.update(
                    1,
                    {
                        nome: "zíper",
                    },
                    user,
                ),
            ).rejects.toBe(error);
        });
    });
});
