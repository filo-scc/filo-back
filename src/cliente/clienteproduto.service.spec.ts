import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ClienteProdutoService } from "./clienteproduto.service";

const { PrismaClientKnownRequestError } = Prisma;

const FABRICO_ID = 10;

describe("ClienteProdutoService", () => {
    let service: ClienteProdutoService;
    let prisma: any;

    beforeEach(() => {
        prisma = {
            $transaction: jest.fn(async (callback) => callback(prisma)),
            cliente: { findFirst: jest.fn() },
            produto: { findFirst: jest.fn() },
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

    it("vincula cliente e produto do mesmo fabrico", async () => {
        prisma.produto.findFirst.mockResolvedValue({ id: 2, fabrico_id: FABRICO_ID });
        prisma.cliente.findFirst.mockResolvedValue({ id: 1, fabrico_id: FABRICO_ID });
        prisma.clienteProduto.findFirst.mockResolvedValue(null);
        prisma.clienteProduto.create.mockResolvedValue({ cliente_id: 1, produto_id: 2 });

        await expect(
            service.vincularClienteProduto(
                1,
                2,
                {
                    nome_para_cliente: "camisa",
                    preco_padrao: 12,
                },
                FABRICO_ID,
            ),
        ).resolves.toEqual({ cliente_id: 1, produto_id: 2 });

        expect(prisma.produto.findFirst).toHaveBeenCalledWith({
            where: { id: 2, fabrico_id: FABRICO_ID },
        });
        expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
            where: { id: 1, fabrico_id: FABRICO_ID },
        });
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
            service.vincularClienteProduto(1, 2, { preco_padrao: -1 } as any, FABRICO_ID),
        ).rejects.toThrow(new BadRequestException("O preço não pode ser negativo."));
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejeita produto inexistente ou de outro fabrico ao vincular", async () => {
        prisma.produto.findFirst.mockResolvedValue(null);

        await expect(service.vincularClienteProduto(1, 2, {} as any, FABRICO_ID)).rejects.toThrow(
            new NotFoundException("Produto não encontrado"),
        );
    });

    it("rejeita cliente inexistente ou de outro fabrico ao vincular", async () => {
        prisma.produto.findFirst.mockResolvedValue({ id: 2, fabrico_id: FABRICO_ID });
        prisma.cliente.findFirst.mockResolvedValue(null);

        await expect(service.vincularClienteProduto(1, 2, {} as any, FABRICO_ID)).rejects.toThrow(
            new NotFoundException("Cliente não encontrado"),
        );
    });

    it("rejeita vinculo duplicado", async () => {
        prisma.produto.findFirst.mockResolvedValue({ id: 2, fabrico_id: FABRICO_ID });
        prisma.cliente.findFirst.mockResolvedValue({ id: 1, fabrico_id: FABRICO_ID });
        prisma.clienteProduto.findFirst.mockResolvedValue({ cliente_id: 1, produto_id: 2 });

        await expect(service.vincularClienteProduto(1, 2, {} as any, FABRICO_ID)).rejects.toThrow(
            new BadRequestException("Esse produto já está vinculado a esse cliente"),
        );
    });

    it("atualiza um vinculo existente", async () => {
        prisma.cliente.findFirst.mockResolvedValue({ id: 1, fabrico_id: FABRICO_ID });
        prisma.produto.findFirst.mockResolvedValue({ id: 2, fabrico_id: FABRICO_ID });
        prisma.clienteProduto.update.mockResolvedValue({ cliente_id: 1, produto_id: 2 });

        await expect(
            service.updateClienteProduto(
                1,
                2,
                {
                    nome_para_cliente: "novo",
                    preco_padrao: 30,
                },
                FABRICO_ID,
            ),
        ).resolves.toEqual({ cliente_id: 1, produto_id: 2 });

        expect(prisma.clienteProduto.update).toHaveBeenCalledWith({
            where: { produto_id_cliente_id: { cliente_id: 1, produto_id: 2 } },
            data: { nome_para_cliente: "novo", preco_padrao: 30 },
        });
    });

    it("traduz update sem vinculo em NotFoundException", async () => {
        prisma.cliente.findFirst.mockResolvedValue({ id: 1, fabrico_id: FABRICO_ID });
        prisma.produto.findFirst.mockResolvedValue({ id: 2, fabrico_id: FABRICO_ID });
        prisma.clienteProduto.update.mockRejectedValue(
            new PrismaClientKnownRequestError("missing", {
                code: "P2025",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.updateClienteProduto(1, 2, {}, FABRICO_ID)).rejects.toThrow(
            new NotFoundException("Relação cliente-produto não encontrada."),
        );
    });

    it("lista produtos por cliente do fabrico autenticado", async () => {
        prisma.cliente.findFirst.mockResolvedValue({ id: 1, fabrico_id: FABRICO_ID });
        prisma.clienteProduto.findMany.mockResolvedValue([{ produto: { id: 2 } }]);

        await expect(service.getAllProdutoByCliente(1, FABRICO_ID)).resolves.toEqual([
            { produto: { id: 2 } },
        ]);
        expect(prisma.clienteProduto.findMany).toHaveBeenCalledWith({
            where: { cliente_id: 1, cliente: { fabrico_id: FABRICO_ID } },
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
        prisma.cliente.findFirst.mockResolvedValue({ id: 1, fabrico_id: FABRICO_ID });
        prisma.clienteProduto.findMany.mockRejectedValue(
            new PrismaClientKnownRequestError("erro", {
                code: "P2000",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.getAllProdutoByCliente(1, FABRICO_ID)).rejects.toThrow(
            new ConflictException("Erro ao buscar produtos"),
        );
    });

    it("lista clientes por produto do fabrico autenticado", async () => {
        prisma.produto.findFirst.mockResolvedValue({ id: 2, fabrico_id: FABRICO_ID });
        prisma.clienteProduto.findMany.mockResolvedValue([{ cliente: { nome: "Loja" } }]);

        await expect(service.getAllClienteByProduto(2, FABRICO_ID)).resolves.toEqual([
            { cliente: { nome: "Loja" } },
        ]);
        expect(prisma.clienteProduto.findMany).toHaveBeenCalledWith({
            where: { produto_id: 2, produto: { fabrico_id: FABRICO_ID } },
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

    it("remove um vinculo do fabrico autenticado", async () => {
        prisma.cliente.findFirst.mockResolvedValue({ id: 1, fabrico_id: FABRICO_ID });
        prisma.produto.findFirst.mockResolvedValue({ id: 2, fabrico_id: FABRICO_ID });
        prisma.clienteProduto.delete.mockResolvedValue({ cliente_id: 1, produto_id: 2 });

        await expect(service.removeClienteProduto(1, 2, FABRICO_ID)).resolves.toEqual({
            cliente_id: 1,
            produto_id: 2,
        });
        expect(prisma.clienteProduto.delete).toHaveBeenCalledWith({
            where: { produto_id_cliente_id: { produto_id: 2, cliente_id: 1 } },
        });
    });

    it("traduz delete sem vinculo em NotFoundException", async () => {
        prisma.cliente.findFirst.mockResolvedValue({ id: 1, fabrico_id: FABRICO_ID });
        prisma.produto.findFirst.mockResolvedValue({ id: 2, fabrico_id: FABRICO_ID });
        prisma.clienteProduto.delete.mockRejectedValue(
            new PrismaClientKnownRequestError("missing", {
                code: "P2025",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.removeClienteProduto(1, 2, FABRICO_ID)).rejects.toThrow(
            new NotFoundException("Este vínculo não existe ou já foi removido."),
        );
    });
});
