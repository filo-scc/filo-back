import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { TecidosService } from "./tecidos.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProdutoService } from "../produto/produto.service";

const mockPrismaService = {
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
    },
    $transaction: jest.fn(),
};

const mockProdutoService = {
    bloquearProdutosParaRecalculo: jest.fn(),
    recalcularCustosTotais: jest.fn(),
};

describe("TecidosService", () => {
    let service: TecidosService;

    const mockTecido = {
        id: 1,
        nome: "Algodão",
        fabrico_id: 10,
        created_at: new Date(),
        updated_at: new Date(),
    };

    beforeEach(async () => {
        mockPrismaService.$transaction.mockImplementation((callback) =>
            callback(mockPrismaService),
        );
        mockPrismaService.produto.findMany.mockResolvedValue([]);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TecidosService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: ProdutoService, useValue: mockProdutoService },
            ],
        }).compile();

        service = module.get<TecidosService>(TecidosService);

        jest.clearAllMocks();
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
            await expect(service.create(dto)).rejects.toThrow("Tecido já existe");
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

    describe("Buscando um tecido expecifico", () => {
        it("deve retornar um tecido com sucesso", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(mockTecido);

            const result = await service.findOne(1);

            expect(result).toEqual(mockTecido);
            expect(mockPrismaService.tecido.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("deve lançar ConflictException se o tecido não for encontrado", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(null);

            await expect(service.findOne(99)).rejects.toThrow(ConflictException);
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

    describe("Atualizando tecidos", () => {
        it("deve atualizar os atributos do tecido com sucesso", async () => {
            const updateDto = { nome: "Seda", fabrico_id: 11 };
            const tecidoAtualizado = { ...mockTecido, ...updateDto };

            mockPrismaService.tecido.findUnique.mockResolvedValue(mockTecido);
            mockPrismaService.tecido.findFirst.mockResolvedValue(null);
            mockPrismaService.tecido.update.mockResolvedValue(tecidoAtualizado);

            const result = await service.update(1, updateDto);

            expect(result).toEqual(tecidoAtualizado);
            expect(mockPrismaService.tecido.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: updateDto,
            });
        });

        it("deve lançar ConflictException se o tecido não for encontrado para atualização", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(null);

            await expect(service.update(99, { nome: "Seda" })).rejects.toThrow(ConflictException);
            expect(mockPrismaService.tecido.update).not.toHaveBeenCalled();
        });

        it("deve lançar ConflictException se já existir outro tecido com o mesmo nome", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(mockTecido);
            mockPrismaService.tecido.findFirst.mockResolvedValue({ ...mockTecido, id: 2 });

            await expect(service.update(1, { nome: "Algodão" })).rejects.toThrow(
                new ConflictException("Tecido com esse nome já existe"),
            );
            expect(mockPrismaService.tecido.update).not.toHaveBeenCalled();
        });
    });

    describe("Removendo Tecidos", () => {
        it("deve remover um tecido com sucesso", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(mockTecido);
            mockPrismaService.tecido.delete.mockResolvedValue(mockTecido);

            const result = await service.remove(1);

            expect(result).toEqual(mockTecido);
            expect(mockPrismaService.tecido.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("deve lançar ConflictException se o tecido não for encontrado para remoção", async () => {
            mockPrismaService.tecido.findUnique.mockResolvedValue(null);

            await expect(service.remove(99)).rejects.toThrow(ConflictException);
            expect(mockPrismaService.tecido.delete).not.toHaveBeenCalled();
        });
    });
});
