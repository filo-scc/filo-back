import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";
import { TecidosService } from "./tecidos.service";

const mockPrismaService = {
    $transaction: jest.fn().mockImplementation(async (cb) => {
        if (typeof cb === "function") {
            return await cb(mockPrismaService);
        }
        return cb;
    }),
    tecido: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    produto: {
        findMany: jest.fn(),
        update: jest.fn(),
    },
};

const mockProdutoService = {};

describe("TecidosService", () => {
    let service: TecidosService;

    const mockTecido = {
        id: 1,
        nome: "Algodão",
        fabrico_id: 10,
        custo_unitario: 15.0,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const mockProduto = {
        id: 100,
        fabrico_id: 10,
        tecido_id: 1,
        quantidade_tecido: 2,
        outros_custos: 5.0,
        custo_tecido: 30.0,
        custo_total: 35.0,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TecidosService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: ProdutoService, useValue: mockProdutoService },
            ],
        }).compile();

        service = module.get<TecidosService>(TecidosService);

        jest.clearAllMocks();
        mockPrismaService.$transaction.mockImplementation(async (cb) => {
            if (typeof cb === "function") {
                return await cb(mockPrismaService);
            }
            return cb;
        });
    });

    describe("Criado Tecidos", () => {
        it("deve criar um tecido com sucesso", async () => {
            mockPrismaService.tecido.findFirst.mockResolvedValue(null);
            mockPrismaService.tecido.create.mockResolvedValue(mockTecido);

            const dto = { nome: "Algodão", fabrico_id: 10 };
            const result = await service.create(dto);

            expect(result).toEqual(mockTecido);
            expect(mockPrismaService.tecido.findFirst).toHaveBeenCalledWith({
                where: { nome: dto.nome, fabrico_id: dto.fabrico_id },
            });
            expect(mockPrismaService.tecido.create).toHaveBeenCalledWith({ data: dto });
        });

        it("deve lançar ConflictException se o tecido já existir", async () => {
            mockPrismaService.tecido.findFirst.mockResolvedValue(mockTecido);

            const dto = { nome: "Algodão", fabrico_id: 10 };

            await expect(service.create(dto)).rejects.toThrow(ConflictException);
            expect(mockPrismaService.tecido.create).not.toHaveBeenCalled();
        });
    });

    describe("Buscando todos os tecidos", () => {
        it("deve retornar uma lista de tecidos", async () => {
            mockPrismaService.tecido.findMany.mockResolvedValue([mockTecido]);

            const result = await service.findAll();

            expect(result).toEqual([mockTecido]);
            expect(mockPrismaService.tecido.findMany).toHaveBeenCalledWith({
                orderBy: { nome: "asc" },
            });
        });
    });

    describe("Buscando um tecido especifico", () => {
        it("deve retornar um tecido com sucesso", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(mockTecido);

            const result = await service.findOne(1);

            expect(result).toEqual(mockTecido);
            expect(mockPrismaService.tecido.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("deve lançar NotFoundException se o tecido não for encontrado", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(null);

            await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
        });
    });

    describe("Buscando os tecidos de um determinado fabrico", () => {
        it("deve retornar todos os tecidos de um determinado fabrico", async () => {
            mockPrismaService.tecido.findMany.mockResolvedValue([mockTecido]);

            const result = await service.findAllByFabrico(10);

            expect(result).toEqual([mockTecido]);
            expect(mockPrismaService.tecido.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: 10 },
                orderBy: { nome: "asc" },
            });
        });
    });

    describe("Atualizando tecidos e recalculando produtos em transação", () => {
        it("deve lançar NotFoundException se o tecido não for encontrado para atualização", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(null);

            await expect(service.update(99, { nome: "Seda" })).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.tecido.update).not.toHaveBeenCalled();
        });

        it("deve lançar ConflictException se já existir outro tecido com o mesmo nome no mesmo fabrico", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(mockTecido);
            mockPrismaService.tecido.findFirst.mockResolvedValue({ ...mockTecido, id: 2 });

            await expect(service.update(1, { nome: "Algodão" })).rejects.toThrow(ConflictException);

            expect(mockPrismaService.tecido.findFirst).toHaveBeenCalledWith({
                where: {
                    nome: "Algodão",
                    fabrico_id: mockTecido.fabrico_id,
                    id: { not: 1 },
                },
            });
            expect(mockPrismaService.tecido.update).not.toHaveBeenCalled();
        });

        it("deve atualizar o tecido e recalcular o custo dos produtos associados", async () => {
            const updateDto = { nome: "Seda", custo_unitario: 20.0 };
            const tecidoAtualizado = { ...mockTecido, ...updateDto };

            mockPrismaService.tecido.findUnique.mockResolvedValue(mockTecido);
            mockPrismaService.tecido.findFirst.mockResolvedValue(null);
            mockPrismaService.tecido.update.mockResolvedValue(tecidoAtualizado);
            mockPrismaService.produto.findMany.mockResolvedValue([mockProduto]);

            const result = await service.update(1, updateDto);

            expect(result).toEqual(tecidoAtualizado);
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(mockPrismaService.tecido.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: updateDto,
            });
            expect(mockPrismaService.produto.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: mockTecido.fabrico_id, tecido_id: 1 },
            });
            expect(mockPrismaService.produto.update).toHaveBeenCalledWith({
                where: { id: mockProduto.id },
                data: {
                    custo_tecido: 40.0, 
                    custo_total: 45.0, 
                },
            });
        });

        it("deve definir custo como null quando o novo custo unitário for null", async () => {
            const updateDto = { custo_unitario: null };
            const tecidoAtualizado = { ...mockTecido, custo_unitario: null };

            mockPrismaService.tecido.findUnique.mockResolvedValue(mockTecido);
            mockPrismaService.tecido.update.mockResolvedValue(tecidoAtualizado);
            mockPrismaService.produto.findMany.mockResolvedValue([mockProduto]);

            await service.update(1, updateDto);

            expect(mockPrismaService.produto.update).toHaveBeenCalledWith({
                where: { id: mockProduto.id },
                data: {
                    custo_tecido: null,
                    custo_total: null,
                },
            });
        });
    });

    describe("Removendo Tecidos em transação", () => {
        it("deve desvincular o tecido, resetar quantidade, zerar custo_tecido e deletar o tecido", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(mockTecido);
            mockPrismaService.produto.findMany.mockResolvedValue([mockProduto]);
            mockPrismaService.tecido.delete.mockResolvedValue(mockTecido);

            const result = await service.remove(1);

            expect(result).toEqual(mockTecido);
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(mockPrismaService.produto.findMany).toHaveBeenCalledWith({
                where: {
                    fabrico_id: mockTecido.fabrico_id,
                    tecido_id: mockTecido.id,
                },
            });

            expect(mockPrismaService.produto.update).toHaveBeenCalledWith({
                where: { id: mockProduto.id },
                data: {
                    tecido_id: null,
                    quantidade_tecido: null,
                    custo_tecido: 0,
                    custo_total: 5.0,
                },
            });

            expect(mockPrismaService.tecido.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("deve lançar NotFoundException se o tecido não for encontrado para remoção", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(null);

            await expect(service.remove(99)).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.tecido.delete).not.toHaveBeenCalled();
        });
    });
});
