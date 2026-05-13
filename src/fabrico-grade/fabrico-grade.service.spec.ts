import { Test, TestingModule } from "@nestjs/testing";
import { FabricoGradeService } from "./fabrico-grade.service";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateFabricoGradeDto } from "./dto/create-fabrico-grade.dto";

describe("FabricoGradeService", () => {
    let service: FabricoGradeService;

    const mockPrismaService = {
        fabrico: {
            findUnique: jest.fn(),
        },
        grade: {
            findUnique: jest.fn(),
        },
        fabricoGrade: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
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
    //validado
    describe("Criando o relacionamento fabrico-grade", () => {
        const createDto: CreateFabricoGradeDto = { fabrico_id: 1, grade_id: 2, ativo: true };

        it("deve criar um relacionamento fabrico-grade com sucesso", async () => {
            mockPrismaService.fabrico.findUnique.mockResolvedValue(mockFabrico);
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);
            mockPrismaService.fabricoGrade.create.mockResolvedValue(mockFabricoGrade);

            const resultado = await service.create(createDto);

            expect(resultado).toEqual({
                message: "Grade liberada para o fabrico com sucesso",
                data: mockFabricoGrade,
            });
            expect(mockPrismaService.fabricoGrade.create).toHaveBeenCalled();
        });

        it("deve lançar NotFoundException se o fabrico não existir", async () => {
            mockPrismaService.fabrico.findUnique.mockResolvedValue(null);

            await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
            await expect(service.create(createDto)).rejects.toThrow("Fabrico não encontrado");
        });

        it("deve lançar NotFoundException se a grade não existir", async () => {
            mockPrismaService.fabrico.findUnique.mockResolvedValue(mockFabrico);
            mockPrismaService.grade.findUnique.mockResolvedValue(null);

            await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
            await expect(service.create(createDto)).rejects.toThrow("Grade não encontrada");
        });

        it("deve lançar ConflictException se o relacionamento já existir", async () => {
            mockPrismaService.fabrico.findUnique.mockResolvedValue(mockFabrico);
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(mockFabricoGrade);

            await expect(service.create(createDto)).rejects.toThrow(ConflictException);
            await expect(service.create(createDto)).rejects.toThrow(
                "Essa grade já está liberada para esse fabrico",
            );
        });

        it("deve lançar BadRequestException em caso de erro de validação do Prisma", async () => {
            mockPrismaService.fabrico.findUnique.mockResolvedValue(mockFabrico);
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);
            mockPrismaService.fabricoGrade.create.mockRejectedValue(mockPrismaValidationError);

            await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
        });

        it("deve lançar ConflictException em caso de erro P2002 do Prisma", async () => {
            mockPrismaService.fabrico.findUnique.mockResolvedValue(mockFabrico);
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);

            const prismaError = new Prisma.PrismaClientKnownRequestError(
                "Unique constraint failed",
                { code: "P2002", clientVersion: "1", meta: {}, batchRequestIdx: 1 },
            );
            mockPrismaService.fabricoGrade.create.mockRejectedValue(prismaError);

            await expect(service.create(createDto)).rejects.toThrow(ConflictException);
            await expect(service.create(createDto)).rejects.toThrow("Essa relação já existe");
        });
    });
    //valido
    describe("Retorna todos os relacionamentos", () => {
        it("deve retornar todos os relacionamentos", async () => {
            mockPrismaService.fabricoGrade.findMany.mockResolvedValue([mockFabricoGrade]);

            const resultado = await service.findAll();

            expect(resultado).toEqual([mockFabricoGrade]);
            expect(mockPrismaService.fabricoGrade.findMany).toHaveBeenCalled();
        });

        it("deve lançar BadRequestException se ocorrer erro de validação do Prisma", async () => {
            mockPrismaService.fabricoGrade.findMany.mockRejectedValue(mockPrismaValidationError);

            await expect(service.findAll()).rejects.toThrow(BadRequestException);
        });
    });
    //validado
    describe("Retorna todos os relacionamentos a partir de um fabrico_id", () => {
        it("deve retornar todas as grades ativas de um fabrico específico", async () => {
            mockPrismaService.fabricoGrade.findMany.mockResolvedValue([mockFabricoGrade]);

            const resultado = await service.findAllByFabricoID(1);

            expect(resultado).toEqual([mockFabricoGrade]);
            expect(mockPrismaService.fabricoGrade.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { fabrico_id: 1, ativo: true } }),
            );
        });

        it("deve lançar BadRequestException em caso de erro do Prisma", async () => {
            mockPrismaService.fabricoGrade.findMany.mockRejectedValue(mockPrismaValidationError);

            await expect(service.findAllByFabricoID(1)).rejects.toThrow(BadRequestException);
        });
    });
    //validado
    describe("Retorna um relacionamento especifico", () => {
        it("deve retornar um relacionamento específico pelo ID", async () => {
            mockPrismaService.fabricoGrade.findUnique.mockResolvedValue(mockFabricoGrade);

            const resultado = await service.findOne(10);

            expect(resultado).toEqual(mockFabricoGrade);
            expect(mockPrismaService.fabricoGrade.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 10 } }),
            );
        });

        it("deve lançar NotFoundException se o relacionamento não for encontrado", async () => {
            mockPrismaService.fabricoGrade.findUnique.mockResolvedValue(null);

            await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
        });

        it("deve lançar BadRequestException em caso de erro do Prisma", async () => {
            mockPrismaService.fabricoGrade.findUnique.mockRejectedValue(mockPrismaValidationError);

            await expect(service.findOne(10)).rejects.toThrow(BadRequestException);
        });
    });
    //validado
    describe("Atualizar o relacionamento", () => {
        it("deve atualizar os dados do relacionamento com sucesso", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockFabricoGrade as any);
            mockPrismaService.fabricoGrade.update.mockResolvedValue({
                ...mockFabricoGrade,
                ativo: false,
            });

            const resultado = await service.update(10, { ativo: false });

            expect(resultado.message).toEqual("Vínculo atualizado com sucesso");
            expect(resultado.data.ativo).toBe(false);
            expect(mockPrismaService.fabricoGrade.update).toHaveBeenCalled();
        });

        it("deve lançar BadRequestException em caso de erro do Prisma", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockFabricoGrade as any);
            mockPrismaService.fabricoGrade.update.mockRejectedValue(mockPrismaValidationError);

            await expect(service.update(10, { ativo: false })).rejects.toThrow(BadRequestException);
        });

        it("deve lançar NotFoundException se tentar atualizar um vínculo que não existe", async () => {
            jest.spyOn(service, "findOne").mockRejectedValue(
                new NotFoundException("Vínculo fabrico-grade não encontrado"),
            );

            await expect(service.update(99, { ativo: false })).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.fabricoGrade.update).not.toHaveBeenCalled();
        });
    });

    describe("Remover o relacionamento fabrico-grade", () => {
        it("deve desativar a grade para o fabrico", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockFabricoGrade as any);
            mockPrismaService.fabricoGrade.update.mockResolvedValue({
                ...mockFabricoGrade,
                ativo: false,
            });

            const resultado = await service.remove(10);

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

            await expect(service.remove(10)).rejects.toThrow(BadRequestException);
        });

        it("deve lançar NotFoundException se tentar remover um vínculo que não existe", async () => {
            jest.spyOn(service, "findOne").mockRejectedValue(
                new NotFoundException("Vínculo fabrico-grade não encontrado"),
            );

            await expect(service.remove(99)).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.fabricoGrade.update).not.toHaveBeenCalled();
        });
    });
});
