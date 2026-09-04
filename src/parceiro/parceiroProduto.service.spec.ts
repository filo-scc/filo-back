import { ConflictException, NotFoundException } from "@nestjs/common";
import { ParceiroProdutoService } from "./parceiroProduto.service";

describe("ParceiroProdutoService", () => {
    let service: ParceiroProdutoService;
    let prisma: any;
    let produtoService: any;
    let parceiroService: any;

    const produtoTenant = { id: 2, fabrico_id: 10 };
    const parceiroTenant = { id: 1, fabrico_id: 10 };

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
            bloquearProdutosParaRecalculo: jest.fn().mockResolvedValue(undefined),
            recalcularCustoTotal: jest.fn().mockResolvedValue(100),
        };
        parceiroService = { getById: jest.fn() };
        service = new ParceiroProdutoService(prisma, produtoService, parceiroService);
    });

    it("cria vinculo entre parceiro e produto do mesmo fabrico autenticado", async () => {
        produtoService.getById.mockResolvedValue(produtoTenant);
        parceiroService.getById.mockResolvedValue(parceiroTenant);
        prisma.parceiroProduto.findUnique.mockResolvedValue(null);
        prisma.parceiroProduto.create.mockResolvedValue({ parceiro_id: 1, produto_id: 2 });

        await expect(service.createParceiroProduto(1, 2, { preco: 15 }, 10)).resolves.toEqual({
            parceiro_id: 1,
            produto_id: 2,
        });

        expect(parceiroService.getById).toHaveBeenCalledWith(1, 10);
        expect(prisma.parceiroProduto.create).toHaveBeenCalledWith({
            data: { produto_id: 2, parceiro_id: 1, preco: 15 },
        });
        expect(produtoService.recalcularCustoTotal).toHaveBeenCalledWith(2, prisma);
        expect(
            produtoService.bloquearProdutosParaRecalculo.mock.invocationCallOrder[0],
        ).toBeLessThan(prisma.parceiroProduto.create.mock.invocationCallOrder[0]);
    });

    it("cria vinculo com preco nulo quando preco nao e informado", async () => {
        produtoService.getById.mockResolvedValue(produtoTenant);
        parceiroService.getById.mockResolvedValue(parceiroTenant);
        prisma.parceiroProduto.findUnique.mockResolvedValue(null);
        prisma.parceiroProduto.create.mockResolvedValue({
            parceiro_id: 1,
            produto_id: 2,
            preco: null,
        });

        await service.createParceiroProduto(1, 2, { preco: null }, 10);

        expect(prisma.parceiroProduto.create).toHaveBeenCalledWith({
            data: { produto_id: 2, parceiro_id: 1, preco: null },
        });
    });

    it("retorna 404 quando o parceiro pertence a outro fabrico", async () => {
        produtoService.getById.mockResolvedValue(produtoTenant);
        parceiroService.getById.mockRejectedValue(new NotFoundException("Parceiro nao encontrado"));

        await expect(service.createParceiroProduto(1, 2, { preco: 15 }, 10)).rejects.toThrow(
            NotFoundException,
        );
    });

    it("retorna 404 quando o produto pertence a outro fabrico", async () => {
        produtoService.getById.mockResolvedValue({ id: 2, fabrico_id: 11 });
        parceiroService.getById.mockResolvedValue(parceiroTenant);

        await expect(service.createParceiroProduto(1, 2, { preco: 15 }, 10)).rejects.toThrow(
            NotFoundException,
        );
    });

    it("rejeita fabrico divergente quando chamado sem tenant", async () => {
        produtoService.getById.mockResolvedValue({ id: 2, fabrico_id: 10 });
        parceiroService.getById.mockResolvedValue({ id: 1, fabrico_id: 11 });

        await expect(service.createParceiroProduto(1, 2, { preco: 15 })).rejects.toThrow(
            new ConflictException("O produto e o parceiro devem pertencer ao mesmo fabrico"),
        );
    });

    it("rejeita create duplicado", async () => {
        produtoService.getById.mockResolvedValue(produtoTenant);
        parceiroService.getById.mockResolvedValue(parceiroTenant);
        prisma.parceiroProduto.findUnique.mockResolvedValue({ parceiro_id: 1, produto_id: 2 });

        await expect(service.createParceiroProduto(1, 2, { preco: 15 }, 10)).rejects.toThrow(
            ConflictException,
        );
    });

    it("remove vinculo existente do tenant autenticado", async () => {
        prisma.parceiroProduto.findUnique.mockResolvedValue({
            parceiro_id: 1,
            produto_id: 2,
            produto: produtoTenant,
            parceiro: parceiroTenant,
        });
        prisma.parceiroProduto.delete.mockResolvedValue({ parceiro_id: 1, produto_id: 2 });

        await expect(service.deleteParceiroProduto(1, 2, 10)).resolves.toEqual({
            parceiro_id: 1,
            produto_id: 2,
        });
        expect(prisma.parceiroProduto.findUnique).toHaveBeenCalledWith({
            where: { produto_id_parceiro_id: { produto_id: 2, parceiro_id: 1 } },
            include: { produto: true, parceiro: true },
        });
        expect(produtoService.recalcularCustoTotal).toHaveBeenCalledWith(2, prisma);
    });

    it("retorna 404 ao remover vinculo de outro tenant", async () => {
        prisma.parceiroProduto.findUnique.mockResolvedValue({
            parceiro_id: 1,
            produto_id: 2,
            produto: { id: 2, fabrico_id: 11 },
            parceiro: { id: 1, fabrico_id: 11 },
        });

        await expect(service.deleteParceiroProduto(1, 2, 10)).rejects.toThrow(NotFoundException);
        expect(prisma.parceiroProduto.delete).not.toHaveBeenCalled();
    });

    it("lista produtos por parceiro existente no tenant", async () => {
        parceiroService.getById.mockResolvedValue(parceiroTenant);
        prisma.parceiroProduto.findMany.mockResolvedValue([{ produto: { id: 2 } }]);

        await expect(service.getProdutosByParceiro(1, 10)).resolves.toEqual([
            { produto: { id: 2 } },
        ]);
        expect(parceiroService.getById).toHaveBeenCalledWith(1, 10);
        expect(prisma.parceiroProduto.findMany).toHaveBeenCalledWith({
            where: { parceiro_id: 1, produto: { fabrico_id: 10 } },
            include: { produto: true },
        });
    });

    it("rejeita listagem de parceiro fora do tenant", async () => {
        parceiroService.getById.mockRejectedValue(new NotFoundException("Parceiro nao encontrado"));

        await expect(service.getProdutosByParceiro(1, 10)).rejects.toThrow(NotFoundException);
    });

    it("lista parceiros por produto existente no tenant", async () => {
        prisma.produto.findUnique.mockResolvedValue(produtoTenant);
        prisma.parceiroProduto.findMany.mockResolvedValue([{ parceiro: { id: 1 } }]);

        await expect(service.getParceiroByProduto(2, 10)).resolves.toEqual([
            { parceiro: { id: 1 } },
        ]);
        expect(prisma.parceiroProduto.findMany).toHaveBeenCalledWith({
            where: { produto_id: 2, parceiro: { fabrico_id: 10 } },
            include: { parceiro: true },
        });
    });

    it("retorna 404 ao listar parceiros de produto fora do tenant", async () => {
        prisma.produto.findUnique.mockResolvedValue({ id: 2, fabrico_id: 11 });

        await expect(service.getParceiroByProduto(2, 10)).rejects.toThrow(NotFoundException);
    });

    it("atualiza preco do vinculo no tenant autenticado", async () => {
        produtoService.getById.mockResolvedValue(produtoTenant);
        parceiroService.getById.mockResolvedValue(parceiroTenant);
        prisma.parceiroProduto.findUnique.mockResolvedValue({ parceiro_id: 1, produto_id: 2 });
        prisma.parceiroProduto.update.mockResolvedValue({ preco: 20 });

        await expect(service.updateParceiroProduto(1, 2, { preco: 20 }, 10)).resolves.toEqual({
            preco: 20,
        });
        expect(prisma.parceiroProduto.update).toHaveBeenCalledWith({
            where: { produto_id_parceiro_id: { produto_id: 2, parceiro_id: 1 } },
            data: { preco: 20 },
        });
        expect(produtoService.recalcularCustoTotal).toHaveBeenCalledWith(2, prisma);
    });

    it("rejeita update sem relacionamento", async () => {
        produtoService.getById.mockResolvedValue(produtoTenant);
        parceiroService.getById.mockResolvedValue(parceiroTenant);
        prisma.parceiroProduto.findUnique.mockResolvedValue(null);

        await expect(service.updateParceiroProduto(1, 2, { preco: 20 }, 10)).rejects.toThrow(
            NotFoundException,
        );
    });

    it("busca vinculo apenas dentro do tenant autenticado", async () => {
        prisma.parceiroProduto.findUnique.mockResolvedValue({
            parceiro_id: 1,
            produto_id: 2,
            produto: produtoTenant,
            parceiro: parceiroTenant,
        });

        await expect(service.getParceiroProduto(2, 1, 10)).resolves.toEqual({
            parceiro_id: 1,
            produto_id: 2,
            produto: produtoTenant,
            parceiro: parceiroTenant,
        });
    });

    it("retorna 404 ao buscar vinculo de outro tenant", async () => {
        prisma.parceiroProduto.findUnique.mockResolvedValue({
            parceiro_id: 1,
            produto_id: 2,
            produto: { id: 2, fabrico_id: 11 },
            parceiro: { id: 1, fabrico_id: 11 },
        });

        await expect(service.getParceiroProduto(2, 1, 10)).rejects.toThrow(NotFoundException);
    });
});
