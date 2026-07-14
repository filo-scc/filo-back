import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { GradeVersaoService } from "./grade-versao.service";

const { PrismaClientKnownRequestError, PrismaClientValidationError } = Prisma;

describe("GradeVersaoService", () => {
    let service: GradeVersaoService;
    let prisma: any;

    const grade = {
        id: 1,
        items: [
            { tamanho_id: 10, posicao: 1, tamanho: { codigo: "P" } },
            { tamanho_id: 11, posicao: 2, tamanho: { codigo: "M" } },
        ],
    };

    beforeEach(() => {
        prisma = {
            $transaction: jest.fn(async (callback) => callback(prisma)),
            grade: { findUnique: jest.fn() },
            gradeVersao: {
                findFirst: jest.fn(),
                create: jest.fn(),
                updateMany: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
            },
            gradeVersaoItem: { createMany: jest.fn() },
            gradeItem: {
                deleteMany: jest.fn(),
                createMany: jest.fn(),
            },
            tamanho: { findMany: jest.fn() },
        };
        service = new GradeVersaoService(prisma);
    });

    it("cria uma primeira versão a partir dos itens da grade", async () => {
        prisma.grade.findUnique.mockResolvedValue(grade);
        prisma.gradeVersao.findFirst.mockResolvedValue(null);
        prisma.tamanho.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
        prisma.gradeVersao.create.mockResolvedValue({ id: 100, versao: 1 });
        prisma.gradeVersao.findUnique.mockResolvedValue({ id: 100, itens: [] });

        await expect(service.createFromGrade(1, {} as any)).resolves.toEqual({
            message: "Nova versão de grade criada com sucesso",
            data: { id: 100, itens: [] },
        });

        expect(prisma.gradeVersao.create).toHaveBeenCalledWith({
            data: { grade_id: 1, versao: 1, ativo: true },
        });
        expect(prisma.gradeVersaoItem.createMany).toHaveBeenCalledWith({
            data: [
                { grade_versao_id: 100, tamanho_id: 10, posicao: 1 },
                { grade_versao_id: 100, tamanho_id: 11, posicao: 2 },
            ],
        });
        expect(prisma.gradeItem.deleteMany).toHaveBeenCalledWith({ where: { grade_id: 1 } });
    });

    it("cria nova versão a partir da última removendo e adicionando tamanhos", async () => {
        prisma.grade.findUnique.mockResolvedValue(grade);
        prisma.gradeVersao.findFirst.mockResolvedValue({
            id: 90,
            versao: 3,
            itens: [
                { tamanho_id: 10, posicao: 1 },
                { tamanho_id: 11, posicao: 2 },
            ],
        });
        prisma.tamanho.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }]);
        prisma.gradeVersao.create.mockResolvedValue({ id: 100, versao: 4 });
        prisma.gradeVersao.findUnique.mockResolvedValue({ id: 100 });

        await service.createFromGrade(1, {
            remover_tamanho_ids: [10],
            adicionar_tamanho_ids: [12],
        } as any);

        expect(prisma.gradeVersao.create).toHaveBeenCalledWith({
            data: { grade_id: 1, versao: 4, ativo: true },
        });
        expect(prisma.gradeVersaoItem.createMany).toHaveBeenCalledWith({
            data: [
                { grade_versao_id: 100, tamanho_id: 11, posicao: 1 },
                { grade_versao_id: 100, tamanho_id: 12, posicao: 2 },
            ],
        });
    });

    it("usa itens enviados explicitamente", async () => {
        prisma.grade.findUnique.mockResolvedValue(grade);
        prisma.gradeVersao.findFirst.mockResolvedValue({ id: 90, versao: 1, itens: [] });
        prisma.tamanho.findMany.mockResolvedValue([{ id: 20 }]);
        prisma.gradeVersao.create.mockResolvedValue({ id: 100, versao: 2 });
        prisma.gradeVersao.findUnique.mockResolvedValue({ id: 100 });

        await service.createFromGrade(1, {
            itens: [{ tamanho_id: 20, posicao: 1 }],
        } as any);

        expect(prisma.gradeVersaoItem.createMany).toHaveBeenCalledWith({
            data: [{ grade_versao_id: 100, tamanho_id: 20, posicao: 1 }],
        });
    });

    it("rejeita grade inexistente", async () => {
        prisma.grade.findUnique.mockResolvedValue(null);

        await expect(service.createFromGrade(1, {} as any)).rejects.toThrow(
            new NotFoundException("Grade não encontrada"),
        );
    });

    it("rejeita versão sem tamanhos", async () => {
        prisma.grade.findUnique.mockResolvedValue({ id: 1, items: [] });
        prisma.gradeVersao.findFirst.mockResolvedValue(null);

        await expect(service.createFromGrade(1, {} as any)).rejects.toThrow(
            new BadRequestException("A versão precisa ter pelo menos um tamanho"),
        );
    });

    it("rejeita posições duplicadas", async () => {
        prisma.grade.findUnique.mockResolvedValue(grade);
        prisma.gradeVersao.findFirst.mockResolvedValue(null);

        await expect(
            service.createFromGrade(1, {
                itens: [
                    { tamanho_id: 10, posicao: 1 },
                    { tamanho_id: 11, posicao: 1 },
                ],
            } as any),
        ).rejects.toThrow(new BadRequestException("A nova versão possui posições duplicadas"));
    });

    it("rejeita tamanhos duplicados", async () => {
        prisma.grade.findUnique.mockResolvedValue(grade);
        prisma.gradeVersao.findFirst.mockResolvedValue(null);

        await expect(
            service.createFromGrade(1, {
                itens: [
                    { tamanho_id: 10, posicao: 1 },
                    { tamanho_id: 10, posicao: 2 },
                ],
            } as any),
        ).rejects.toThrow(new BadRequestException("A nova versão possui tamanhos duplicados"));
    });

    it("rejeita tamanho inválido", async () => {
        prisma.grade.findUnique.mockResolvedValue(grade);
        prisma.gradeVersao.findFirst.mockResolvedValue(null);
        prisma.tamanho.findMany.mockResolvedValue([{ id: 10 }]);

        await expect(service.createFromGrade(1, {} as any)).rejects.toThrow(
            new BadRequestException("Um ou mais tamanhos informados são inválidos"),
        );
    });

    it("traduz conflito Prisma ao criar versão", async () => {
        prisma.grade.findUnique.mockResolvedValue(grade);
        prisma.gradeVersao.findFirst.mockResolvedValue(null);
        prisma.tamanho.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
        prisma.$transaction.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.createFromGrade(1, {} as any)).rejects.toThrow(
            new ConflictException("Conflito ao criar versão de grade"),
        );
    });

    it("lista versões por grade", async () => {
        prisma.gradeVersao.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAllByGradeID(1)).resolves.toEqual([{ id: 1 }]);
        expect(prisma.gradeVersao.findMany).toHaveBeenCalledWith({
            where: { grade_id: 1 },
            orderBy: { versao: "desc" },
            include: {
                itens: { include: { tamanho: true }, orderBy: { posicao: "asc" } },
            },
        });
    });

    it("traduz parâmetro inválido ao listar", async () => {
        prisma.gradeVersao.findMany.mockRejectedValue(
            new PrismaClientValidationError("invalid", { clientVersion: "7.0.0" }),
        );

        await expect(service.findAllByGradeID(1)).rejects.toThrow(
            new BadRequestException("Parâmetros inválidos"),
        );
    });

    it("busca uma versão existente", async () => {
        prisma.gradeVersao.findUnique.mockResolvedValue({ id: 1 });

        await expect(service.findOne(1)).resolves.toEqual({ id: 1 });
    });

    it("rejeita versão inexistente", async () => {
        prisma.gradeVersao.findUnique.mockResolvedValue(null);

        await expect(service.findOne(1)).rejects.toThrow(
            new NotFoundException("Versão de grade não encontrada"),
        );
    });

    it("ativa uma versão e desativa as demais", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1, grade_id: 10 } as any);
        prisma.gradeVersao.update.mockResolvedValue({ id: 1, ativo: true });

        await expect(service.activate(1)).resolves.toEqual({
            message: "Versão ativada com sucesso",
            data: { id: 1, ativo: true },
        });
        expect(prisma.gradeVersao.updateMany).toHaveBeenCalledWith({
            where: { grade_id: 10, id: { not: 1 } },
            data: { ativo: false },
        });
    });

    it("traduz erro de validação ao ativar", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1, grade_id: 10 } as any);
        prisma.$transaction.mockRejectedValue(
            new PrismaClientValidationError("invalid", { clientVersion: "7.0.0" }),
        );

        await expect(service.activate(1)).rejects.toThrow(
            new BadRequestException("Dados inválidos"),
        );
    });

    it("desativa uma versão", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1 } as any);
        prisma.gradeVersao.update.mockResolvedValue({ id: 1, ativo: false });

        await expect(service.remove(1)).resolves.toEqual({
            message: "Versão desativada com sucesso",
            data: { id: 1, ativo: false },
        });
        expect(prisma.gradeVersao.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { ativo: false },
        });
    });
});
