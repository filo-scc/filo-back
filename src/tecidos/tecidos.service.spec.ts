import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";
import { TecidosService } from "./tecidos.service";

const { PrismaClientKnownRequestError } = Prisma;

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
        update: jest.fn(),
        delete: jest.fn(),
    },
    produto: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
    },
};

const mockProdutoService = {
    recalcularCustoTotal: jest.fn(),
};

describe("TecidosService", () => {
    let service: TecidosService;
    const fabricoId = 10;

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

    describe("create", () => {
        it("deve criar um tecido com sucesso", async () => {
            mockPrismaService.tecido.create.mockResolvedValue(mockTecido);

            const dto = { nome: "Algodão" };
            const result = await service.create(dto, fabricoId);

            expect(result).toEqual(mockTecido);
            expect(mockPrismaService.tecido.create).toHaveBeenCalledWith({
                data: { ...dto, fabrico_id: fabricoId },
            });
        });

        it("deve lançar BadRequestException se fabrico_id diferente for informado", async () => {
            const dto = { nome: "Algodão", fabrico_id: 99 };

            await expect(service.create(dto, fabricoId)).rejects.toThrow(
                new BadRequestException("Não é permitido alterar o fabrico do tecido"),
            );
            expect(mockPrismaService.tecido.create).not.toHaveBeenCalled();
        });

        it("deve traduzir erro de duplicidade (P2002) para ConflictException", async () => {
            mockPrismaService.tecido.create.mockRejectedValue(
                new PrismaClientKnownRequestError("duplicado", {
                    code: "P2002",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(service.create({ nome: "Algodão" }, fabricoId)).rejects.toThrow(
                new ConflictException("Tecido já existe"),
            );
        });

        it("deve traduzir erro de chave estrangeira (P2003) para NotFoundException", async () => {
            mockPrismaService.tecido.create.mockRejectedValue(
                new PrismaClientKnownRequestError("fk inválida", {
                    code: "P2003",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(service.create({ nome: "Algodão" }, fabricoId)).rejects.toThrow(
                new NotFoundException("Fabrico não encontrado"),
            );
        });
    });

    describe("findAll", () => {
        it("deve retornar uma lista de tecidos do fabrico", async () => {
            mockPrismaService.tecido.findMany.mockResolvedValue([mockTecido]);

            const result = await service.findAll(fabricoId);

            expect(result).toEqual([mockTecido]);
            expect(mockPrismaService.tecido.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: fabricoId },
                orderBy: { nome: "asc" },
            });
        });
    });

    describe("findOne", () => {
        it("deve retornar um tecido com sucesso", async () => {
            mockPrismaService.tecido.findFirst.mockResolvedValue(mockTecido);

            const result = await service.findOne(1, fabricoId);

            expect(result).toEqual(mockTecido);
            expect(mockPrismaService.tecido.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: fabricoId },
            });
        });

        it("deve lançar NotFoundException se o tecido não for encontrado", async () => {
            mockPrismaService.tecido.findFirst.mockResolvedValue(null);

            await expect(service.findOne(99, fabricoId)).rejects.toThrow(
                new NotFoundException("Tecido não encontrado"),
            );
        });
    });

    describe("findAllByFabrico", () => {
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

    describe("update", () => {
        it("deve atualizar o tecido e recalcular o custo dos produtos associados", async () => {
            const updateDto = { nome: "Seda", custo_unitario: 20.0 };
            const tecidoAtualizado = { ...mockTecido, ...updateDto };

            mockPrismaService.tecido.findFirst.mockResolvedValue(mockTecido);
            mockPrismaService.tecido.update.mockResolvedValue(tecidoAtualizado);
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: mockProduto.id }]);

            const result = await service.update(1, updateDto, fabricoId);

            expect(result).toEqual(tecidoAtualizado);
            expect(mockPrismaService.tecido.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: fabricoId },
            });
            expect(mockPrismaService.tecido.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { ...updateDto, fabrico_id: mockTecido.fabrico_id },
            });
            expect(mockPrismaService.produto.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: mockTecido.fabrico_id, tecido_id: 1 },
                select: { id: true },
            });
            expect(mockProdutoService.recalcularCustoTotal).toHaveBeenCalledWith(
                mockProduto.id,
                mockPrismaService,
            );
        });

        it("deve lançar BadRequestException se tentar alterar o fabrico_id", async () => {
            await expect(
                service.update(1, { nome: "Seda", fabrico_id: 99 }, fabricoId),
            ).rejects.toThrow(
                new BadRequestException("Não é permitido alterar o fabrico do tecido"),
            );
        });

        it("deve lançar NotFoundException se o tecido não existir para atualização", async () => {
            mockPrismaService.tecido.findFirst.mockResolvedValue(null);

            await expect(service.update(99, { nome: "Seda" }, fabricoId)).rejects.toThrow(
                new NotFoundException("Tecido não encontrado"),
            );
        });

        it("deve traduzir erro P2002 na atualização para ConflictException", async () => {
            mockPrismaService.tecido.findFirst.mockResolvedValue(mockTecido);
            mockPrismaService.tecido.update.mockRejectedValue(
                new PrismaClientKnownRequestError("duplicado", {
                    code: "P2002",
                    clientVersion: "7.0.0",
                }),
            );

            await expect(service.update(1, { nome: "Seda" }, fabricoId)).rejects.toThrow(
                new ConflictException("Tecido com esse nome já existe"),
            );
        });
    });

    describe("remove", () => {
        it("deve desvincular produtos, recalcular custos e deletar o tecido", async () => {
            mockPrismaService.tecido.findFirst.mockResolvedValue(mockTecido);
            mockPrismaService.produto.findMany.mockResolvedValue([{ id: mockProduto.id }]);
            mockPrismaService.tecido.delete.mockResolvedValue(mockTecido);

            const result = await service.remove(1, fabricoId);

            expect(result).toEqual(mockTecido);
            expect(mockPrismaService.tecido.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: fabricoId },
            });
            expect(mockPrismaService.produto.updateMany).toHaveBeenCalledWith({
                where: {
                    fabrico_id: mockTecido.fabrico_id,
                    tecido_id: 1,
                },
                data: {
                    tecido_id: null,
                    quantidade_tecido: null,
                    custo_tecido: 0,
                },
            });
            expect(mockProdutoService.recalcularCustoTotal).toHaveBeenCalledWith(
                mockProduto.id,
                mockPrismaService,
            );
            expect(mockPrismaService.tecido.delete).toHaveBeenCalledWith({
                where: { id: mockTecido.id },
            });
        });

        it("deve lançar NotFoundException se o tecido não for encontrado para remoção", async () => {
            mockPrismaService.tecido.findFirst.mockResolvedValue(null);

            await expect(service.remove(99, fabricoId)).rejects.toThrow(
                new NotFoundException("Tecido não encontrado"),
            );
            expect(mockPrismaService.tecido.delete).not.toHaveBeenCalled();
        });
    });
});
