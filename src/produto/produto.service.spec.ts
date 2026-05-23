import { PrismaService } from "../prisma/prisma.service";
import { Test, TestingModule } from "@nestjs/testing";
import { ProdutoService } from "./produto.service";
import { BadRequestException } from "@nestjs/common/exceptions/bad-request.exception";
import { PrismaClientKnownRequestError } from "@prisma/client-runtime-utils";
import { ConflictException, NotFoundException } from "@nestjs/common";

const mockPrismaService = {
    produto: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
    },
    gradeVersao: {
        findFirst: jest.fn(),
    },
};

describe("ProdutoService", () => {
    let service: ProdutoService;
    let prismaService: typeof mockPrismaService;
    let produtoData: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ProdutoService, { provide: PrismaService, useValue: mockPrismaService }],
        }).compile();

        service = module.get<ProdutoService>(ProdutoService);
        prismaService = module.get(PrismaService);
    });

    beforeAll(() => {
        produtoData = {
            fabrico_id: 1,
            nome: "Produto Teste",
            descricao: "Descrição do produto teste",
            preco: 100.0,
            gradeVersaoId: 1,
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("create", () => {
        it("Criar um produto com sucesso", async () => {
            const ProdutoCriado = { id: 1, ...produtoData };

            prismaService.produto.create.mockResolvedValue(ProdutoCriado);

            const result = await service.create(produtoData);

            expect(prismaService.produto.create).toHaveBeenCalledWith({
                data: produtoData,
            });

            expect(result).toEqual(ProdutoCriado);
        });

        it("Criar um produto sem a grade de versão com sucesso", async () => {
            const ProdutoCriado = { id: 1, ...produtoData };

            prismaService.gradeVersao.findFirst.mockResolvedValue(null);

            prismaService.produto.create.mockResolvedValue(ProdutoCriado);

            const resultado = await service.create(produtoData);

            expect(prismaService.gradeVersao.findFirst).not.toHaveBeenCalled();

            expect(prismaService.produto.create).toHaveBeenCalledWith({
                data: produtoData,
            });

            expect(resultado).toEqual(ProdutoCriado);
        });

        it("Criar um produto com uma grade de versão inválida", async () => {
            const produtoDataComGradeInvalida = { id: 1, ...produtoData, grade_versao_id: 999 };

            prismaService.gradeVersao.findFirst.mockResolvedValue(null);

            await expect(service.create(produtoDataComGradeInvalida)).rejects.toThrow(
                new BadRequestException("Versão de grade inválida ou inativa"),
            );

            expect(prismaService.gradeVersao.findFirst).toHaveBeenCalledWith({
                where: {
                    id: produtoDataComGradeInvalida.grade_versao_id,
                    ativo: true,
                },
            });
        });

        it("Criar um produto com um nome já existente para o mesmo fabrico", async () => {
            const produtoCriado = { ...produtoData };

            const prismaError = new PrismaClientKnownRequestError("Erro simulado", {
                code: "P2002",
                clientVersion: "5.0.0",
                meta: { target: "nome" },
            });

            prismaService.produto.create.mockRejectedValue(prismaError);

            const resultado = service.create(produtoCriado);

            await expect(resultado).rejects.toThrow(
                new ConflictException("Já existe um produto com este nome para este fabrico"),
            );

            expect(prismaService.produto.create).toHaveBeenCalledWith({
                data: produtoData,
            });

            expect(prismaService.produto.create).toHaveBeenCalledTimes(1);
        });

        it("Criar um produto em um fabrico que não existe deve retornar um erro", async () => {
            const produtoDataFabricoInexistente = { ...produtoData, fabrico_id: 999 };

            const prismaError = new PrismaClientKnownRequestError("Erro simulado", {
                code: "P2003",
                clientVersion: "5.0.0",
                meta: { field_name: "fabrico_id" },
            });

            prismaService.produto.create.mockRejectedValue(prismaError);

            const resultado = service.create(produtoDataFabricoInexistente);

            await expect(resultado).rejects.toThrow(prismaError);

            expect(prismaService.produto.create).toHaveBeenCalledWith({
                data: produtoDataFabricoInexistente,
            });

            expect(prismaService.produto.create).toHaveBeenCalledTimes(1);
        });
    });

    describe("findAll", () => {
        it("Deve retornar uma lista de produtos", async () => {
            const produtos = [
                { id: 1, nome: "Produto 1", fabrico_id: 1 },
                { id: 2, nome: "Produto 2", fabrico_id: 1 },
            ];

            prismaService.produto.findMany.mockResolvedValue(produtos);

            const result = await service.findAll();

            expect(prismaService.produto.findMany).toHaveBeenCalled();
            expect(result).toEqual(produtos);
        });
    });

    describe("getById", () => {
        it("Deve retornar um produto pelo ID com sucesso", async () => {
            const produtoCriado = { id: 1, ...produtoData };

            prismaService.produto.findUnique.mockResolvedValue(produtoCriado);

            const result = await service.getById(1);

            expect(prismaService.produto.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(result).toEqual(produtoCriado);
        });
        it("Deve lançar um erro ao tentar obter um produto que não existe", async () => {
            prismaService.produto.findUnique.mockResolvedValue(null);

            const resultado = service.getById(999);

            await expect(resultado).rejects.toThrow(
                new NotFoundException("Produto não encontrado"),
            );

            expect(prismaService.produto.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });

            expect(prismaService.produto.findUnique).toHaveBeenCalledTimes(1);
        });
    });

    describe("delete", () => {
        it("Deve deletar um produto com sucesso", async () => {
            const produtoCriado = { id: 1, ...produtoData };

            prismaService.produto.findUnique.mockResolvedValue(produtoCriado);
            prismaService.produto.delete.mockResolvedValue(produtoCriado);

            const result = await service.delete(1);

            expect(prismaService.produto.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });

            expect(prismaService.produto.delete).toHaveBeenCalledWith({ where: { id: 1 } });

            expect(result).toEqual("O produto com o id 1 foi deletado com sucesso");

            expect(prismaService.produto.findUnique).toHaveBeenCalledTimes(1);

            expect(prismaService.produto.delete).toHaveBeenCalledTimes(1);
        });

        it("Deve lançar um erro ao tentar deletar um produto que não existe", async () => {
            prismaService.produto.findUnique.mockResolvedValue(null);

            const resultado = service.delete(999);

            await expect(resultado).rejects.toThrow(
                new NotFoundException("Produto não encontrado"),
            );

            expect(prismaService.produto.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });

            expect(prismaService.produto.findUnique).toHaveBeenCalledTimes(1);
        });
    });
    describe("update", () => {
        it("Deve atualizar um produto com sucesso", async () => {
            const produtoCriado = { id: 1, ...produtoData };
            const dadosAtualizados = { nome: "Produto Atualizado" };

            prismaService.produto.findUnique.mockResolvedValue(produtoCriado);
            prismaService.produto.update.mockResolvedValue({
                ...produtoCriado,
                ...dadosAtualizados,
            });

            const resultado = await service.update(1, dadosAtualizados);

            expect(prismaService.produto.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(prismaService.produto.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { ...dadosAtualizados },
            });
            expect(resultado).toEqual("O produto com o id 1 foi atualizado");
            expect(prismaService.produto.findUnique).toHaveBeenCalledTimes(1);
            expect(prismaService.produto.update).toHaveBeenCalledTimes(1);
        });

        it("Deve lançar um erro ao tentar atualizar um produto que não existe", async () => {
            prismaService.produto.findUnique.mockResolvedValue(null);

            const resultado = service.update(999, { nome: "Produto Atualizado" });

            await expect(resultado).rejects.toThrow(
                new NotFoundException("Produto não encontrado"),
            );

            expect(prismaService.produto.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
            expect(prismaService.produto.update).not.toHaveBeenCalled();
            expect(prismaService.produto.findUnique).toHaveBeenCalledTimes(1);
            expect(prismaService.produto.update).toHaveBeenCalledTimes(0);
        });
        it("Deve lançar um erro ao tentar atualizar um produto com uma grade de versão inválida", async () => {
            const produtoCriado = { id: 1, ...produtoData };
            const dadosAtualizados = { grade_versao_id: 999 };

            prismaService.produto.findUnique.mockResolvedValue(produtoCriado);
            prismaService.gradeVersao.findFirst.mockResolvedValue(null);

            const resultado = service.update(1, dadosAtualizados);

            await expect(resultado).rejects.toThrow(
                new BadRequestException("Versão de grade inválida ou inativa"),
            );

            expect(prismaService.produto.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });

            expect(prismaService.gradeVersao.findFirst).toHaveBeenCalledWith({
                where: {
                    id: dadosAtualizados.grade_versao_id,
                    ativo: true,
                },
            });
            expect(prismaService.produto.update).not.toHaveBeenCalled();

            expect(prismaService.produto.findUnique).toHaveBeenCalledTimes(1);

            expect(prismaService.gradeVersao.findFirst).toHaveBeenCalledTimes(1);

            expect(prismaService.produto.update).toHaveBeenCalledTimes(0);
        });
    });

    it("Deve lançar um erro caso tente atualizar um produto com um nome já existente para o mesmo fabrico", async () => {
        const produtoCriado = { id: 1, ...produtoData };
        const dadosAtualizados = { nome: "Produto Existente" };

        const prismaError = new PrismaClientKnownRequestError("Erro simulado", {
            code: "P2002",
            clientVersion: "5.0.0",
            meta: { target: "nome" },
        });

        prismaService.produto.findUnique.mockResolvedValue(produtoCriado);
        prismaService.produto.update.mockRejectedValue(prismaError);

        const resultado = service.update(1, dadosAtualizados);

        await expect(resultado).rejects.toThrow(
            new ConflictException("Já existe um produto com este nome para este fabrico"),
        );

        expect(prismaService.produto.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });

        expect(prismaService.produto.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { ...dadosAtualizados },
        });

        expect(prismaService.produto.findUnique).toHaveBeenCalledTimes(1);

        expect(prismaService.produto.update).toHaveBeenCalledTimes(1);
    });

    describe("findAllFabrico", () => {
        it("Deve retornar uma lista de produtos para um fabrico específico", async () => {
            const produtos = [
                { id: 1, nome: "Produto 1", fabrico_id: 1 },
                { id: 2, nome: "Produto 2", fabrico_id: 1 },
                { id: 3, nome: "Produto 3", fabrico_id: 2 },
            ];

            prismaService.produto.findMany.mockResolvedValue(
                produtos.filter((p) => p.fabrico_id === 1),
            );

            const result = await service.findAllFabrico(1);

            expect(prismaService.produto.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 1 },
                include: {
                    tecido: true,
                },
            });
            expect(result).toEqual(produtos.filter((p) => p.fabrico_id === 1));

            expect(prismaService.produto.findMany).toHaveBeenCalledTimes(1);

            expect(result).toEqual([
                { id: 1, nome: "Produto 1", fabrico_id: 1 },
                { id: 2, nome: "Produto 2", fabrico_id: 1 },
            ]);
        });
    });

    describe("getUnassociatedProductsForClient", () => {
        it("Deve retornar uma lista de produtos não associados a um cliente para um fabrico específico", async () => {
            const cliente_id = 1;
            const fabrico_id = 1;
            const produtosEsperados = [
                { id: 1, nome: "Produto 1", fabrico_id: 1 },
                { id: 2, nome: "Produto 2", fabrico_id: 1 },
            ];

            prismaService.produto.findMany.mockResolvedValue(produtosEsperados);

            const result = await service.getUnassociatedProductsForClient(cliente_id, fabrico_id);

            expect(prismaService.produto.findMany).toHaveBeenCalledWith({
                where: {
                    fabrico_id: fabrico_id,
                    cliente_produto: {
                        none: {
                            cliente_id: cliente_id,
                        },
                    },
                },
            });

            expect(result).toEqual(produtosEsperados);
            expect(result).toHaveLength(2);
        });
    });
});
