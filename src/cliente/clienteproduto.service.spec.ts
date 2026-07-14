import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ClienteProdutoService } from "./clienteproduto.service";

const { PrismaClientKnownRequestError } = Prisma;

describe("ClienteProdutoService", () => {
    let service: ClienteProdutoService;
    let prisma: any;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
        prisma = {
            $transaction: jest.fn(async (callback) => callback(prisma)),
            cliente: { findUnique: jest.fn() },
            produto: { findUnique: jest.fn() },
            clienteProduto: {
                update: jest.fn(),
                findFirst: jest.fn(),
                create: jest.fn(),
                findMany: jest.fn(),
                delete: jest.fn(),
            },
        };
        service = new ClienteProdutoService(prisma);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("vincula cliente e produto do mesmo fabrico", async () => {
        prisma.produto.findUnique.mockResolvedValue({ id: 2, fabrico_id: 10 });
        prisma.cliente.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.clienteProduto.findFirst.mockResolvedValue(null);
        prisma.clienteProduto.create.mockResolvedValue({ cliente_id: 1, produto_id: 2 });

        await expect(
            service.vincularClienteProduto(1, 2, {
                nome_para_cliente: "camisa",
                preco_padrao: 12,
            }),
        ).resolves.toEqual({ cliente_id: 1, produto_id: 2 });

        expect(prisma.clienteProduto.create).toHaveBeenCalledWith({
            data: {
                cliente_id: 1,
                produto_id: 2,
                nome_para_cliente: "camisa",
                preco_padrao: 12,
            },
        });
    });

    it("rejeita preco negativo ao vincular", async () => {
        await expect(
            service.vincularClienteProduto(1, 2, { preco_padrao: -1 } as any),
        ).rejects.toThrow(new BadRequestException("O preço não pode ser negativo."));
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejeita produto inexistente ao vincular", async () => {
        prisma.produto.findUnique.mockResolvedValue(null);

        await expect(service.vincularClienteProduto(1, 2, {})).rejects.toThrow(
            new NotFoundException("Esse produto não existe"),
        );
    });

    it("rejeita cliente inexistente ao vincular", async () => {
        prisma.produto.findUnique.mockResolvedValue({ id: 2, fabrico_id: 10 });
        prisma.cliente.findUnique.mockResolvedValue(null);

        await expect(service.vincularClienteProduto(1, 2, {})).rejects.toThrow(
            new NotFoundException("Esse cliente não existe"),
        );
    });

    it("rejeita cliente e produto de fabricos diferentes", async () => {
        prisma.produto.findUnique.mockResolvedValue({ id: 2, fabrico_id: 10 });
        prisma.cliente.findUnique.mockResolvedValue({ id: 1, fabrico_id: 11 });

        await expect(service.vincularClienteProduto(1, 2, {})).rejects.toThrow(
            new BadRequestException("Cliente e produto não pertencem ao mesmo fabrico"),
        );
    });

    it("rejeita vinculo duplicado", async () => {
        prisma.produto.findUnique.mockResolvedValue({ id: 2, fabrico_id: 10 });
        prisma.cliente.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.clienteProduto.findFirst.mockResolvedValue({ cliente_id: 1, produto_id: 2 });

        await expect(service.vincularClienteProduto(1, 2, {})).rejects.toThrow(
            new BadRequestException("Esse produto já está vinculado a esse cliente"),
        );
    });

    it("atualiza um vinculo existente", async () => {
        prisma.cliente.findUnique.mockResolvedValue({ id: 1 });
        prisma.produto.findUnique.mockResolvedValue({ id: 2 });
        prisma.clienteProduto.update.mockResolvedValue({ cliente_id: 1, produto_id: 2 });

        await expect(
            service.updateClienteProduto(1, 2, {
                nome_para_cliente: "novo",
                preco_padrao: 30,
            }),
        ).resolves.toEqual({ cliente_id: 1, produto_id: 2 });

        expect(prisma.clienteProduto.update).toHaveBeenCalledWith({
            where: { produto_id_cliente_id: { cliente_id: 1, produto_id: 2 } },
            data: { nome_para_cliente: "novo", preco_padrao: 30 },
        });
    });

    it("traduz update sem vinculo em NotFoundException", async () => {
        prisma.cliente.findUnique.mockResolvedValue({ id: 1 });
        prisma.produto.findUnique.mockResolvedValue({ id: 2 });
        prisma.clienteProduto.update.mockRejectedValue(
            new PrismaClientKnownRequestError("missing", {
                code: "P2025",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.updateClienteProduto(1, 2, {})).rejects.toThrow(
            new NotFoundException("Relação cliente-produto não encontrada."),
        );
    });

    it("lista produtos por cliente", async () => {
        prisma.clienteProduto.findMany.mockResolvedValue([{ produto: { id: 2 } }]);

        await expect(service.getAllProdutoByCliente(1)).resolves.toEqual([{ produto: { id: 2 } }]);
        expect(prisma.clienteProduto.findMany).toHaveBeenCalledWith({
            where: { cliente_id: 1 },
            select: {
                nome_para_cliente: true,
                preco_padrao: true,
                produto: {
                    select: {
                        id: true,
                        foto: true,
                        nome: true,
                        tipo_produto: { select: { id: true, nome: true } },
                    },
                },
            },
        });
    });

    it("traduz erro Prisma ao listar produtos por cliente", async () => {
        prisma.clienteProduto.findMany.mockRejectedValue(
            new PrismaClientKnownRequestError("erro", {
                code: "P2000",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.getAllProdutoByCliente(1)).rejects.toThrow(
            new ConflictException("Erro ao buscar produtos"),
        );
    });

    it("lista clientes por produto", async () => {
        prisma.clienteProduto.findMany.mockResolvedValue([{ cliente: { nome: "Loja" } }]);

        await expect(service.getAllClienteByProduto(2)).resolves.toEqual([
            { cliente: { nome: "Loja" } },
        ]);
        expect(prisma.clienteProduto.findMany).toHaveBeenCalledWith({
            where: { produto_id: 2 },
            select: {
                nome_para_cliente: true,
                preco_padrao: true,
                cliente: {
                    select: {
                        nome: true,
                        cnpj: true,
                        telefone: true,
                        responsavel: true,
                        status: true,
                    },
                },
            },
        });
    });

    it("remove um vinculo", async () => {
        prisma.clienteProduto.delete.mockResolvedValue({ cliente_id: 1, produto_id: 2 });

        await expect(service.removeClienteProduto(1, 2)).resolves.toEqual({
            cliente_id: 1,
            produto_id: 2,
        });
        expect(prisma.clienteProduto.delete).toHaveBeenCalledWith({
            where: { produto_id_cliente_id: { produto_id: 2, cliente_id: 1 } },
        });
    });

    it("traduz delete sem vinculo em NotFoundException", async () => {
        prisma.clienteProduto.delete.mockRejectedValue(
            new PrismaClientKnownRequestError("missing", {
                code: "P2025",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.removeClienteProduto(1, 2)).rejects.toThrow(
            new NotFoundException("Este vínculo não existe ou já foi removido."),
        );
    });
});
