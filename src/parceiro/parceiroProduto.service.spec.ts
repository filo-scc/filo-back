import { ConflictException, NotFoundException } from "@nestjs/common";
import { ParceiroProdutoService } from "./parceiroProduto.service";

describe("ParceiroProdutoService", () => {
    let service: ParceiroProdutoService;
    let prisma: any;
    let produtoService: any;
    let parceiroService: any;

    beforeEach(() => {
        prisma = {
            parceiroProduto: {
                findUnique: jest.fn(),
                create: jest.fn(),
                delete: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
            },
            parceiro: { findUnique: jest.fn() },
            produto: { findUnique: jest.fn() },
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));
        produtoService = {
            getById: jest.fn(),
            recalcularCustoTotal: jest.fn().mockResolvedValue(100),
        };
        parceiroService = { getById: jest.fn() };
        service = new ParceiroProdutoService(prisma, produtoService, parceiroService);
    });

    it("cria vinculo entre parceiro e produto do mesmo fabrico", async () => {
        produtoService.getById.mockResolvedValue({ id: 2, fabrico_id: 10 });
        parceiroService.getById.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.parceiroProduto.findUnique.mockResolvedValue(null);
        prisma.parceiroProduto.create.mockResolvedValue({ parceiro_id: 1, produto_id: 2 });

        await expect(service.createParceiroProduto(1, 2, { preco: 15 })).resolves.toEqual({
            parceiro_id: 1,
            produto_id: 2,
        });

        expect(prisma.parceiroProduto.create).toHaveBeenCalledWith({
            data: { produto_id: 2, parceiro_id: 1, preco: 15 },
        });
        expect(produtoService.recalcularCustoTotal).toHaveBeenCalledWith(2, prisma);
    });

    it("cria vínculo com preço nulo quando o preço não é informado", async () => {
        produtoService.getById.mockResolvedValue({ id: 2, fabrico_id: 10 });
        parceiroService.getById.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.parceiroProduto.findUnique.mockResolvedValue(null);
        prisma.parceiroProduto.create.mockResolvedValue({
            parceiro_id: 1,
            produto_id: 2,
            preco: null,
        });

        await service.createParceiroProduto(1, 2, { preco: null });

        expect(prisma.parceiroProduto.create).toHaveBeenCalledWith({
            data: { produto_id: 2, parceiro_id: 1, preco: null },
        });
    });

    it("rejeita fabrico divergente no create", async () => {
        produtoService.getById.mockResolvedValue({ id: 2, fabrico_id: 10 });
        parceiroService.getById.mockResolvedValue({ id: 1, fabrico_id: 11 });

        await expect(service.createParceiroProduto(1, 2, { preco: 15 })).rejects.toThrow(
            new ConflictException("O produto e o parceiro devem pertencer ao mesmo fabrico"),
        );
    });

    it("rejeita create duplicado", async () => {
        produtoService.getById.mockResolvedValue({ id: 2, fabrico_id: 10 });
        parceiroService.getById.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.parceiroProduto.findUnique.mockResolvedValue({ parceiro_id: 1, produto_id: 2 });

        await expect(service.createParceiroProduto(1, 2, { preco: 15 })).rejects.toThrow(
            new ConflictException("Este produto já está vinculado a este parceiro"),
        );
    });

    it("remove vinculo existente", async () => {
        prisma.parceiroProduto.findUnique.mockResolvedValue({ parceiro_id: 1, produto_id: 2 });
        prisma.parceiroProduto.delete.mockResolvedValue({ parceiro_id: 1, produto_id: 2 });

        await expect(service.deleteParceiroProduto(1, 2)).resolves.toEqual({
            parceiro_id: 1,
            produto_id: 2,
        });
        expect(produtoService.recalcularCustoTotal).toHaveBeenCalledWith(2, prisma);
    });

    it("rejeita delete sem vinculo", async () => {
        prisma.parceiroProduto.findUnique.mockResolvedValue(null);

        await expect(service.deleteParceiroProduto(1, 2)).rejects.toThrow(
            new NotFoundException("Vínculo não encontrado"),
        );
    });

    it("lista produtos por parceiro existente", async () => {
        prisma.parceiro.findUnique.mockResolvedValue({ id: 1 });
        prisma.parceiroProduto.findMany.mockResolvedValue([{ produto: { id: 2 } }]);

        await expect(service.getProdutosByParceiro(1)).resolves.toEqual([{ produto: { id: 2 } }]);
        expect(prisma.parceiroProduto.findMany).toHaveBeenCalledWith({
            where: { parceiro_id: 1 },
            include: { produto: true },
        });
    });

    it("rejeita listagem de parceiro inexistente", async () => {
        prisma.parceiro.findUnique.mockResolvedValue(null);

        await expect(service.getProdutosByParceiro(1)).rejects.toThrow(
            new NotFoundException("Parceiro não encontrado"),
        );
    });

    it("lista parceiros por produto existente", async () => {
        prisma.produto.findUnique.mockResolvedValue({ id: 2 });
        prisma.parceiroProduto.findMany.mockResolvedValue([{ parceiro: { id: 1 } }]);

        await expect(service.getParceiroByProduto(2)).resolves.toEqual([{ parceiro: { id: 1 } }]);
        expect(prisma.parceiroProduto.findMany).toHaveBeenCalledWith({
            where: { produto_id: 2 },
            include: { parceiro: true },
        });
    });

    it("atualiza preco do vinculo", async () => {
        produtoService.getById.mockResolvedValue({ id: 2, fabrico_id: 10 });
        parceiroService.getById.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.parceiroProduto.findUnique.mockResolvedValue({ parceiro_id: 1, produto_id: 2 });
        prisma.parceiroProduto.update.mockResolvedValue({ preco: 20 });

        await expect(service.updateParceiroProduto(1, 2, { preco: 20 })).resolves.toEqual({
            preco: 20,
        });
        expect(prisma.parceiroProduto.update).toHaveBeenCalledWith({
            where: { produto_id_parceiro_id: { produto_id: 2, parceiro_id: 1 } },
            data: { preco: 20 },
        });
        expect(produtoService.recalcularCustoTotal).toHaveBeenCalledWith(2, prisma);
    });

    it("atualiza o vínculo com preço nulo quando o preço não é informado", async () => {
        produtoService.getById.mockResolvedValue({ id: 2, fabrico_id: 10 });
        parceiroService.getById.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.parceiroProduto.findUnique.mockResolvedValue({ parceiro_id: 1, produto_id: 2 });
        prisma.parceiroProduto.update.mockResolvedValue({ preco: null });

        await service.updateParceiroProduto(1, 2, { preco: null });

        expect(prisma.parceiroProduto.update).toHaveBeenCalledWith({
            where: { produto_id_parceiro_id: { produto_id: 2, parceiro_id: 1 } },
            data: { preco: null },
        });
    });

    it("rejeita update sem relacionamento", async () => {
        produtoService.getById.mockResolvedValue({ id: 2, fabrico_id: 10 });
        parceiroService.getById.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.parceiroProduto.findUnique.mockResolvedValue(null);

        await expect(service.updateParceiroProduto(1, 2, { preco: 20 })).rejects.toThrow(
            new NotFoundException("Relacionamento não encontrado"),
        );
    });

    it("busca um vinculo com produto e parceiro", async () => {
        prisma.parceiroProduto.findUnique.mockResolvedValue({ parceiro_id: 1, produto_id: 2 });

        await expect(service.getParceiroProduto(2, 1)).resolves.toEqual({
            parceiro_id: 1,
            produto_id: 2,
        });
        expect(prisma.parceiroProduto.findUnique).toHaveBeenCalledWith({
            where: { produto_id_parceiro_id: { produto_id: 2, parceiro_id: 1 } },
            include: { produto: true, parceiro: true },
        });
    });
});
