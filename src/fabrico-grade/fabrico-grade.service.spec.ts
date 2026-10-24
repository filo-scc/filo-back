import { Test, TestingModule } from "@nestjs/testing";
import { FabricoGradeService } from "./fabrico-grade.service";
import { PrismaService } from "../prisma/prisma.service";
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateFabricoGradeDto } from "./dto/create-fabrico-grade.dto";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

describe("FabricoGradeService", () => {
    let service: FabricoGradeService;

    const mockAdminUser: AuthenticatedUser = {
        id: 1,
        cargo: "ADMIN",
        fabrico_id: null,
    } as AuthenticatedUser;

    const mockGerenteUser: AuthenticatedUser = {
        id: 2,
        cargo: "GERENTE",
        fabrico_id: 1,
    } as AuthenticatedUser;

    const mockProprietarioUser: AuthenticatedUser = {
        id: 4,
        cargo: "PROPRIETARIO",
        fabrico_id: 2,
    } as AuthenticatedUser;

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
    const mockFabricoGradeOutroFabrico = {
        ...mockFabricoGrade,
        id: 11,
        fabrico_id: 2,
        fabrico: { id: 2, nome: "Outro Fabrico" },
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

        it("deve criar um relacionamento fabrico-grade com sucesso para ADMIN", async () => {
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);
            mockPrismaService.fabricoGrade.create.mockResolvedValue(mockFabricoGrade);

            const resultado = await service.create(createDto, mockAdminUser);

            expect(resultado).toEqual({
                message: "Grade liberada para o fabrico com sucesso",
                data: mockFabricoGrade,
            });
            expect(mockPrismaService.fabricoGrade.create).toHaveBeenCalled();
        });

        it("deve lançar ForbiddenException se o usuário for GERENTE ou PROPRIETARIO", async () => {
            await expect(service.create(createDto, mockGerenteUser)).rejects.toThrow(
                new ForbiddenException(
                    "Usuário não tem permissão para criar vínculo de grade com fabrico",
                ),
            );
        });

        it("deve lançar BadRequestException se o usuário ADMIN não informar fabrico alvo", async () => {
            const dtoSemFabrico: CreateFabricoGradeDto = { grade_id: 2, ativo: true };

            await expect(service.create(dtoSemFabrico, mockAdminUser)).rejects.toThrow(
                new BadRequestException("Fabrico alvo obrigatório para usuários ADMIN"),
            );
        });

        it("deve aceitar o fabrico alvo informado pelo ADMIN", async () => {
            const adminDto: CreateFabricoGradeDto = { fabrico_id: 1, grade_id: 2, ativo: true };
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);
            mockPrismaService.fabricoGrade.create.mockResolvedValue(mockFabricoGrade);

            await expect(service.create(adminDto, mockAdminUser)).resolves.toEqual({
                message: "Grade liberada para o fabrico com sucesso",
                data: mockFabricoGrade,
            });
        });

        it("deve lançar NotFoundException se a grade não existir", async () => {
            mockPrismaService.grade.findUnique.mockResolvedValue(null);

            await expect(service.create(createDto, mockAdminUser)).rejects.toThrow(
                new NotFoundException("Grade não encontrada"),
            );
        });

        it("deve lançar ConflictException se o relacionamento já existir", async () => {
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(mockFabricoGrade);

            await expect(service.create(createDto, mockAdminUser)).rejects.toThrow(
                new ConflictException("Essa grade já está liberada para esse fabrico"),
            );
        });

        it("deve lançar BadRequestException em caso de erro de validação do Prisma", async () => {
            mockPrismaService.grade.findUnique.mockResolvedValue(mockGrade);
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);
            mockPrismaService.fabricoGrade.create.mockRejectedValue(mockPrismaValidationError);

            await expect(service.create(createDto, mockAdminUser)).rejects.toThrow(
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

            await expect(service.create(createDto, mockAdminUser)).rejects.toThrow(
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

            await expect(service.create(createDto, mockAdminUser)).rejects.toThrow(
                new NotFoundException("Relacionamento inválido"),
            );
        });
    });

    describe("findAll", () => {
        it("deve limitar ADMIN à fábrica-alvo informada", async () => {
            mockPrismaService.fabricoGrade.findMany.mockResolvedValue([
                mockFabricoGradeOutroFabrico,
            ]);

            const resultado = await service.findAll(mockAdminUser, 2);

            expect(resultado).toEqual([mockFabricoGradeOutroFabrico]);
            expect(mockPrismaService.fabricoGrade.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { fabrico_id: 2, ativo: true },
                }),
            );
        });

        it("deve rejeitar ADMIN sem fábrica-alvo explícita", async () => {
            await expect(service.findAll(mockAdminUser)).rejects.toThrow(
                new BadRequestException("Fabrico alvo obrigatório para usuários ADMIN"),
            );
            expect(mockPrismaService.fabricoGrade.findMany).not.toHaveBeenCalled();
        });

        it.each([
            ["GERENTE", mockGerenteUser, mockFabricoGrade, 2],
            ["PROPRIETARIO", mockProprietarioUser, mockFabricoGradeOutroFabrico, 1],
        ])(
            "deve limitar %s à própria fábrica mesmo que outro alvo seja informado",
            async (_cargo, user, vinculoEsperado, outroFabricoId) => {
                mockPrismaService.fabricoGrade.findMany.mockResolvedValue([vinculoEsperado]);

                const resultado = await service.findAll(user, outroFabricoId);

                expect(resultado).toEqual([vinculoEsperado]);
                expect(mockPrismaService.fabricoGrade.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: { fabrico_id: user.fabrico_id, ativo: true },
                    }),
                );
            },
        );
    });

    describe("findAllByFabricoID", () => {
        it("deve rejeitar operação de listagem por fabrico para ADMIN quando não houver target explícito", async () => {
            await expect(service.findAllByFabricoID(mockAdminUser)).rejects.toThrow(
                new BadRequestException("Usuário não possui um fabrico associado"),
            );
            expect(mockPrismaService.fabricoGrade.findMany).not.toHaveBeenCalled();
        });
    });

    describe("findOne", () => {
        it("deve retornar um relacionamento específico pelo ID para ADMIN sem filtrar por fabrico do usuário", async () => {
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(mockFabricoGrade);

            const resultado = await service.findOne(10, mockAdminUser);

            expect(resultado).toEqual(mockFabricoGrade);
            expect(mockPrismaService.fabricoGrade.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 10 },
                }),
            );
        });

        it("deve lançar NotFoundException se o relacionamento não for encontrado", async () => {
            mockPrismaService.fabricoGrade.findFirst.mockResolvedValue(null);

            await expect(service.findOne(99, mockAdminUser)).rejects.toThrow(
                new NotFoundException("Vínculo fabrico-grade não encontrado"),
            );
        });
    });

    describe("update", () => {
        it("deve atualizar os dados do relacionamento com sucesso para ADMIN", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockFabricoGrade as any);
            mockPrismaService.fabricoGrade.update.mockResolvedValue({
                ...mockFabricoGrade,
                ativo: false,
            });

            const resultado = await service.update(10, { ativo: false }, mockAdminUser);

            expect(resultado.message).toEqual("Vínculo atualizado com sucesso");
            expect(resultado.data.ativo).toBe(false);
            expect(mockPrismaService.fabricoGrade.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: { ativo: false },
                include: { fabrico: true, grade: true },
            });
        });

        it("deve permitir reativar o vínculo alterando apenas ativo", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue({
                ...mockFabricoGrade,
                ativo: false,
            } as any);
            mockPrismaService.fabricoGrade.update.mockResolvedValue(mockFabricoGrade);

            await service.update(10, { ativo: true }, mockAdminUser);

            expect(mockPrismaService.fabricoGrade.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { ativo: true } }),
            );
        });

        it.each([
            ["diferente", 99],
            ["igual ao atual", 1],
            ["nulo", null],
        ])(
            "deve recusar fabrico_id %s no payload sem consultar ou alterar o vínculo",
            async (_caso, fabricoId) => {
                const findOne = jest.spyOn(service, "findOne");

                await expect(
                    service.update(10, { ativo: true, fabrico_id: fabricoId }, mockAdminUser),
                ).rejects.toThrow(
                    new BadRequestException("Não é permitido alterar o fabrico da grade"),
                );
                expect(findOne).not.toHaveBeenCalled();
                expect(mockPrismaService.fabricoGrade.update).not.toHaveBeenCalled();
            },
        );

        it.each([
            ["diferente", 3],
            ["igual ao atual", 2],
            ["nulo", null],
        ])(
            "deve recusar grade_id %s no payload e manter a grade original",
            async (_caso, gradeId) => {
                const findOne = jest.spyOn(service, "findOne");

                await expect(
                    service.update(10, { ativo: true, grade_id: gradeId }, mockAdminUser),
                ).rejects.toThrow(
                    new BadRequestException("Não é permitido alterar a grade do vínculo"),
                );
                expect(findOne).not.toHaveBeenCalled();
                expect(mockPrismaService.fabricoGrade.update).not.toHaveBeenCalled();
            },
        );

        it("deve recusar payload sem ativo booleano", async () => {
            await expect(
                service.update(10, { ativo: "false" } as any, mockAdminUser),
            ).rejects.toThrow(new BadRequestException("Informe o campo ativo como booleano"));
            await expect(service.update(10, {} as any, mockAdminUser)).rejects.toThrow(
                new BadRequestException("Informe o campo ativo como booleano"),
            );
            expect(mockPrismaService.fabricoGrade.update).not.toHaveBeenCalled();
        });

        it.each([
            ["GERENTE", mockGerenteUser],
            ["PROPRIETARIO", mockProprietarioUser],
        ])("deve recusar %s mesmo em chamada direta ao service", async (_cargo, user) => {
            await expect(service.update(10, { ativo: true }, user)).rejects.toThrow(
                new ForbiddenException(
                    "Usuário não tem permissão para alterar vínculo de grade com fabrico",
                ),
            );
            expect(mockPrismaService.fabricoGrade.findFirst).not.toHaveBeenCalled();
            expect(mockPrismaService.fabricoGrade.update).not.toHaveBeenCalled();
        });

        it("deve lançar BadRequestException em caso de erro de validação do Prisma", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockFabricoGrade as any);
            mockPrismaService.fabricoGrade.update.mockRejectedValue(mockPrismaValidationError);

            await expect(service.update(10, { ativo: false }, mockAdminUser)).rejects.toThrow(
                BadRequestException,
            );
        });

        it("deve lançar NotFoundException se tentar atualizar um vínculo que não existe", async () => {
            jest.spyOn(service, "findOne").mockRejectedValue(
                new NotFoundException("Vínculo fabrico-grade não encontrado"),
            );

            await expect(service.update(99, { ativo: false }, mockAdminUser)).rejects.toThrow(
                NotFoundException,
            );
            expect(mockPrismaService.fabricoGrade.update).not.toHaveBeenCalled();
        });
    });

    describe("remove", () => {
        it("deve desativar a grade para o fabrico para ADMIN", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockFabricoGrade as any);
            mockPrismaService.fabricoGrade.update.mockResolvedValue({
                ...mockFabricoGrade,
                ativo: false,
            });

            const resultado = await service.remove(10, mockAdminUser);

            expect(resultado.message).toEqual("Grade desativada para o fabrico com sucesso");
            expect(resultado.data.ativo).toBe(false);
            expect(mockPrismaService.fabricoGrade.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 10 },
                    data: { ativo: false },
                }),
            );
        });

        it("deve lançar ForbiddenException se o usuário for GERENTE ou PROPRIETARIO", async () => {
            await expect(service.remove(10, mockGerenteUser)).rejects.toThrow(
                new ForbiddenException(
                    "Usuário não tem permissão para criar vínculo de grade com fabrico",
                ),
            );
        });

        it("deve lançar BadRequestException em caso de erro do Prisma", async () => {
            jest.spyOn(service, "findOne").mockResolvedValue(mockFabricoGrade as any);
            mockPrismaService.fabricoGrade.update.mockRejectedValue(mockPrismaValidationError);

            await expect(service.remove(10, mockAdminUser)).rejects.toThrow(BadRequestException);
        });

        it("deve lançar NotFoundException se tentar remover um vínculo que não existe", async () => {
            jest.spyOn(service, "findOne").mockRejectedValue(
                new NotFoundException("Vínculo fabrico-grade não encontrado"),
            );

            await expect(service.remove(99, mockAdminUser)).rejects.toThrow(NotFoundException);
            expect(mockPrismaService.fabricoGrade.update).not.toHaveBeenCalled();
        });
    });
});
