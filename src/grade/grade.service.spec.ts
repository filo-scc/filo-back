import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { GradeService } from "./grade.service";

const { PrismaClientKnownRequestError, PrismaClientValidationError } = Prisma;

describe("GradeService", () => {
    let service: GradeService;
    let prisma: any;

    const createDto = {
        nome: " Grade PP ",
        itens: [
            { tamanho_id: 1, posicao: 1 },
            { tamanho_id: 2, posicao: 2 },
        ],
    };

    beforeEach(() => {
        prisma = {
            $transaction: jest.fn(async (callback) => callback(prisma)),
            grade: {
                findFirst: jest.fn(),
                create: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
            },
            gradeItem: { createMany: jest.fn() },
            gradeVersao: { create: jest.fn() },
            gradeVersaoItem: { createMany: jest.fn() },
            tamanho: { findMany: jest.fn() },
        };
        service = new GradeService(prisma);
    });

    it("cria grade com itens e primeira versão", async () => {
        prisma.grade.findFirst.mockResolvedValue(null);
        prisma.tamanho.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        prisma.grade.create.mockResolvedValue({ id: 10 });
        prisma.gradeVersao.create.mockResolvedValue({ id: 20 });
        prisma.grade.findUnique.mockResolvedValue({ id: 10, nome: "grade pp" });

        await expect(service.create(createDto as any)).resolves.toEqual({
            message: "Grade criada com sucesso",
            data: { id: 10, nome: "grade pp" },
        });

        expect(prisma.grade.create).toHaveBeenCalledWith({
            data: { nome: "Grade PP", ativo: true },
        });
        expect(prisma.gradeItem.createMany).toHaveBeenCalledWith({
            data: [
                { grade_id: 10, tamanho_id: 1, posicao: 1 },
                { grade_id: 10, tamanho_id: 2, posicao: 2 },
            ],
        });
        expect(prisma.gradeVersao.create).toHaveBeenCalledWith({
            data: { grade_id: 10, versao: 1, ativo: true },
        });
    });

    it("rejeita grade sem tamanhos", async () => {
        await expect(service.create({ nome: "Grade", itens: [] } as any)).rejects.toThrow(
            new BadRequestException("Informe ao menos um tamanho para a grade"),
        );
    });

    it("rejeita posições duplicadas", async () => {
        await expect(
            service.create({
                nome: "Grade",
                itens: [
                    { tamanho_id: 1, posicao: 1 },
                    { tamanho_id: 2, posicao: 1 },
                ],
            } as any),
        ).rejects.toThrow(new BadRequestException("A grade possui posições duplicadas"));
    });

    it("rejeita tamanhos duplicados", async () => {
        await expect(
            service.create({
                nome: "Grade",
                itens: [
                    { tamanho_id: 1, posicao: 1 },
                    { tamanho_id: 1, posicao: 2 },
                ],
            } as any),
        ).rejects.toThrow(new BadRequestException("A grade possui tamanhos duplicados"));
    });

    it("rejeita nome duplicado", async () => {
        prisma.grade.findFirst.mockResolvedValue({ id: 99 });

        await expect(service.create(createDto as any)).rejects.toThrow(
            new ConflictException("Já existe uma grade com esse nome"),
        );
    });

    it("rejeita tamanhos inválidos", async () => {
        prisma.grade.findFirst.mockResolvedValue(null);
        prisma.tamanho.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.create(createDto as any)).rejects.toThrow(
            new BadRequestException("Um ou mais tamanhos informados são inválidos"),
        );
    });

    it("traduz conflito Prisma ao criar", async () => {
        prisma.grade.findFirst.mockResolvedValue(null);
        prisma.tamanho.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        prisma.$transaction.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.create(createDto as any)).rejects.toThrow(
            new ConflictException("Conflito ao criar grade"),
        );
    });

    it("traduz validação Prisma ao criar", async () => {
        prisma.grade.findFirst.mockResolvedValue(null);
        prisma.tamanho.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        prisma.$transaction.mockRejectedValue(
            new PrismaClientValidationError("invalid", { clientVersion: "7.0.0" }),
        );

        await expect(service.create(createDto as any)).rejects.toThrow(
            new BadRequestException("Dados inválidos"),
        );
    });

    it("lista grades com itens e última versão", async () => {
        prisma.grade.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
        expect(prisma.grade.findMany).toHaveBeenCalledWith({
            include: {
                items: { include: { tamanho: true }, orderBy: { posicao: "asc" } },
                versoes: {
                    orderBy: { versao: "desc" },
                    take: 1,
                    include: {
                        itens: { include: { tamanho: true }, orderBy: { posicao: "asc" } },
                    },
                },
            },
            orderBy: { nome: "asc" },
        });
    });

    it("busca uma grade existente", async () => {
        prisma.grade.findUnique.mockResolvedValue({ id: 1 });

        await expect(service.findOne(1)).resolves.toEqual({ id: 1 });
    });

    it("rejeita grade inexistente", async () => {
        prisma.grade.findUnique.mockResolvedValue(null);

        await expect(service.findOne(1)).rejects.toThrow(
            new NotFoundException("Grade não encontrada"),
        );
    });

    it("atualiza grade existente", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1, nome: "antiga", ativo: true } as any);
        prisma.grade.findFirst.mockResolvedValue(null);
        prisma.grade.update.mockResolvedValue({ id: 1, nome: "nova", ativo: false });

        await expect(service.update(1, { nome: " Nova ", ativo: false })).resolves.toEqual({
            message: "Grade atualizada com sucesso",
            data: { id: 1, nome: "nova", ativo: false },
        });
        expect(prisma.grade.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { nome: "Nova", ativo: false },
        });
    });

    it("rejeita update com nome duplicado", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1, nome: "antiga", ativo: true } as any);
        prisma.grade.findFirst.mockResolvedValue({ id: 2 });

        await expect(service.update(1, { nome: "Nova" })).rejects.toThrow(
            new ConflictException("Já existe uma grade com esse nome"),
        );
    });

    it("traduz validação Prisma ao atualizar", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1, nome: "antiga", ativo: true } as any);
        prisma.grade.findFirst.mockResolvedValue(null);
        prisma.grade.update.mockRejectedValue(
            new PrismaClientValidationError("invalid", { clientVersion: "7.0.0" }),
        );

        await expect(service.update(1, { nome: "Nova" })).rejects.toThrow(
            new BadRequestException("Dados inválidos"),
        );
    });

    it("desativa grade no remove", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1 } as any);
        prisma.grade.update.mockResolvedValue({ id: 1, ativo: false });

        await expect(service.remove(1)).resolves.toEqual({
            message: "Grade desativada com sucesso",
            data: { id: 1, ativo: false },
        });
        expect(prisma.grade.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { ativo: false },
        });
    });
});
