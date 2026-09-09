import { Test, TestingModule } from "@nestjs/testing";
import { FabricoGradeService } from "./fabrico-grade.service";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateFabricoGradeDto } from "./dto/create-fabrico-grade.dto";

describe("FabricoGradeService", () => {
    let service: FabricoGradeService;
    const userFabricoId = 1;

    const mockPrismaService = {
        grade: {
            findUnique: jest.fn(),
        },
        fabricoGrade: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
    };

    const mockFabrico = { id: 1, nome: "Fabrico Teste" };
    const mockGrade = { id: 2, nome: "Grade Teste" };
    const mockFabricoGrade = {
        id: 10,
        fabrico_id: 1,
        grade_id: 2,
        ativo: true,
        fabrico: mockFabrico,
        grade: mockGrade,
    };

    const mockPrismaValidationError = new Prisma.PrismaClientValidationError(
        "Erro de validação Prisma",
        { clientVersion: "1" },
    );

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FabricoGradeService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<FabricoGradeService>(FabricoGradeService);
        jest.clearAllMocks();
    });

    it("deve estar definido", () => {
        expect(service).toBeDefined();
    });

    describe("create", () => {
        const createDto: CreateFabricoGradeDto = { fabrico_id: 1, grade_id: 2, ativo: true };

        it("deve criar um relacionamento fabrico-grade com sucesso", async () => {
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);
            mockPrismaService.fabricoGrade.create.mockResolvedValue(mockFabricoGrade);

            const resultado = await service.create(createDto, userFabricoId);

            expect(resultado).toEqual({
                message: "Grade liberada para o fabrico com sucesso",
                data: mockFabricoGrade,
            });
            expect(mockPrismaService.fabricoGrade.create).toHaveBeenCalled();
        });

        it("deve lançar BadRequestException se tentar alterar o fabrico_id", async () => {
            const invalidDto: CreateFabricoGradeDto = { fabrico_id: 99, grade_id: 2, ativo: true };

            await expect(service.create(invalidDto, userFabricoId)).rejects.toThrow(
                new BadRequestException("Não é permitido alterar o fabrico da grade"),
            );
        });

        it("deve lançar NotFoundException se a grade não existir", async () => {
            mockPrismaService.grade.findUnique.mockResolvedValue(null);

            await expect(service.create(createDto, userFabricoId)).rejects.toThrow(
                new NotFoundException("Grade não encontrada"),
            );
        });

        it("deve lançar ConflictException se o relacionamento já existir", async () => {
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(mockFabricoGrade);

            await expect(service.create(createDto, userFabricoId)).rejects.toThrow(
                new ConflictException("Essa grade já está liberada para esse fabrico"),
            );
        });

        it("deve lançar BadRequestException em caso de erro de validação do Prisma", async () => {
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);
            mockPrismaService.fabricoGrade.create.mockRejectedValue(mockPrismaValidationError);

            await expect(service.create(createDto, userFabricoId)).rejects.toThrow(
                BadRequestException,
            );
        });

        it("deve lançar ConflictException em caso de erro P2002 do Prisma", async () => {
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);

            const prismaError = new Prisma.PrismaClientKnownRequestError(
                "Unique constraint failed",
                { code: "P2002", clientVersion: "1", meta: {}, batchRequestIdx: 1 },
            );
            mockPrismaService.fabricoGrade.create.mockRejectedValue(prismaError);

            await expect(service.create(createDto, userFabricoId)).rejects.toThrow(
                new ConflictException("Essa relação já existe"),
            );
        });

        it("deve lançar NotFoundException em caso de erro P2003 do Prisma", async () => {
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);

            const prismaError = new Prisma.PrismaClientKnownRequestError(
                "Foreign key constraint failed",
                { code: "P2003", clientVersion: "1", meta: {}, batchRequestIdx: 1 },
            );
            mockPrismaService.fabricoGrade.create.mockRejectedValue(prismaError);

            await expect(service.create(createDto, userFabricoId)).rejects.toThrow(
                new NotFoundException("Relacionamento inválido"),
            );
        });
    });

    describe("findAll", () => {
        it("deve retornar todos os relacionamentos filtrando por fabrico_id se fornecido", async () => {
            mockPrismaService.fabricoGrade.findMany.mockResolvedValue([mockFabricoGrade]);

            const resultado = await service.findAll(userFabricoId);

            expect(resultado).toEqual([mockFabricoGrade]);
            expect(mockPrismaService.fabricoGrade.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { fabrico_id: userFabricoId } }),
            );
        });
    });

    describe("findAllByFabricoID", () => {
        it("deve retornar todas as grades ativas de um fabrico específico", async () => {
            mockPrismaService.fabricoGrade.findMany.mockResolvedValue([mockFabricoGrade]);

            const resultado = await service.findAllByFabricoID(1);

            expect(resultado).toEqual([mockFabricoGrade]);
            expect(mockPrismaService.fabricoGrade.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { fabrico_id: 1, ativo: true } }),
            );
        });
    });

    describe("findOne", () => {
        it("deve retornar um relacionamento específico pelo ID", async () => {
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(mockFabricoGrade);

            const resultado = await service.findOne(10, userFabricoId);

            expect(resultado).toEqual(mockFabricoGrade);
            expect(mockPrismaService.fabricoGrade.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 10, fabrico_id: userFabricoId } }),
            );
        });

        it("deve lançar NotFoundException se o relacionamento não for encontrado", async () => {
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);

            await expect(service.findOne(99, userFabricoId)).rejects.toThrow(
                new NotFoundException("Vínculo fabrico-grade não encontrado"),
            );
        });
    });

    describe("update", () => {
        it("deve atualizar os dados do relacionamento com sucesso", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockFabricoGrade as any);
            mockPrismaService.fabricoGrade.update.mockResolvedValue({
                ...mockFabricoGrade,
                ativo: false,
            });

            const resultado = await service.update(10, { ativo: false }, userFabricoId);

            expect(resultado.message).toEqual("Vínculo atualizado com sucesso");
            expect(resultado.data.ativo).toBe(false);
            expect(mockPrismaService.fabricoGrade.update).toHaveBeenCalled();
        });

        it("deve lançar BadRequestException se tentar alterar o fabrico_id", async () => {
            await expect(service.update(10, { fabrico_id: 99 }, userFabricoId)).rejects.toThrow(
                new BadRequestException("Não é permitido alterar o fabrico da grade"),
            );
        });

        it("deve lançar BadRequestException em caso de erro de validação do Prisma", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockFabricoGrade as any);
            mockPrismaService.fabricoGrade.update.mockRejectedValue(mockPrismaValidationError);

            await expect(service.update(10, { ativo: false }, userFabricoId)).rejects.toThrow(
                BadRequestException,
            );
        });

        it("deve lançar NotFoundException se tentar atualizar um vínculo que não existe", async () => {
            jest.spyOn(service, "findOne").mockRejectedValue(
                new NotFoundException("Vínculo fabrico-grade não encontrado"),
            );

            await expect(service.update(99, { ativo: false }, userFabricoId)).rejects.toThrow(
                NotFoundException,
            );
            expect(mockPrismaService.fabricoGrade.update).not.toHaveBeenCalled();
        });
    });

    describe("remove", () => {
        it("deve desativar a grade para o fabrico", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockFabricoGrade as any);
            mockPrismaService.fabricoGrade.update.mockResolvedValue({
                ...mockFabricoGrade,
                ativo: false,
            });

            const resultado = await service.remove(10, userFabricoId);

            expect(resultado.message).toEqual("Grade desativada para o fabrico com sucesso");
            expect(resultado.data.ativo).toBe(false);
            expect(mockPrismaService.fabricoGrade.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 10 },
                    data: { ativo: false },
                }),
            );
        });

        it("deve lançar BadRequestException em caso de erro do Prisma", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockFabricoGrade as any);
            mockPrismaService.fabricoGrade.update.mockRejectedValue(mockPrismaValidationError);

            await expect(service.remove(10, userFabricoId)).rejects.toThrow(BadRequestException);
        });

        it("deve lançar NotFoundException se tentar remover um vínculo que não existe", async () => {
            jest.spyOn(service, "findOne").mockRejectedValue(
                new NotFoundException("Vínculo fabrico-grade não encontrado"),
            );

            await expect(service.remove(99, userFabricoId)).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.fabricoGrade.update).not.toHaveBeenCalled();
        });
    });
});
