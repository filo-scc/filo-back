import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CorService } from "./cor.service";

const { PrismaClientKnownRequestError, PrismaClientValidationError } = Prisma;

describe("CorService", () => {
    let service: CorService;
    let prisma: any;
    const user = { fabrico_id: 10 } as any;

    beforeEach(() => {
        prisma = {
            cor: {
                findFirst: jest.fn(),
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
        };
        service = new CorService(prisma);
    });

    it("cria cor normalizando o nome", async () => {
        prisma.cor.findFirst.mockResolvedValue(null);
        prisma.cor.create.mockResolvedValue({ id: 1, nome: "azul" });

        await expect(
            service.create({ nome: " Azul ", codigo_hex: "#00f", fabrico_id: 10 } as any, user),
        ).resolves.toEqual({ message: "Cor criada com sucesso", data: { id: 1, nome: "azul" } });
        expect(prisma.cor.create).toHaveBeenCalledWith({
            data: {
                nome: "Azul",
                codigo_hex: "#00f",
                fabrico_id: 10,
                tipo: undefined,
                foto: undefined,
            },
        });
    });

    it("rejeita cor duplicada no fabrico", async () => {
        prisma.cor.findFirst.mockResolvedValue({ id: 1 });

        await expect(service.create({ nome: "Azul", fabrico_id: 10 } as any, user)).rejects.toThrow(
            new ConflictException("Já existe uma cor com esse nome nesse fabrico"),
        );
    });

    it("traduz erros Prisma no create", async () => {
        prisma.cor.findFirst.mockResolvedValue(null);
        prisma.cor.create.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.create({ nome: "Azul", fabrico_id: 10 } as any, user)).rejects.toThrow(
            new ConflictException("Cor já cadastrada"),
        );
    });

    it("traduz validação Prisma no create", async () => {
        prisma.cor.findFirst.mockResolvedValue(null);
        prisma.cor.create.mockRejectedValue(
            new PrismaClientValidationError("invalid", { clientVersion: "7.0.0" }),
        );

        await expect(service.create({ nome: "Azul", fabrico_id: 10 } as any, user)).rejects.toThrow(
            new BadRequestException("Dados inválidos"),
        );
    });

    it("lista cores", async () => {
        prisma.cor.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAll(user)).resolves.toEqual([{ id: 1 }]);
        expect(prisma.cor.findMany).toHaveBeenCalledWith({
            where: { fabrico_id: 10 },
            orderBy: { nome: "asc" },
        });
    });

    it("lista cores por fabrico", async () => {
        prisma.cor.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAllByFabricoID(10, user)).resolves.toEqual([{ id: 1 }]);
        expect(prisma.cor.findMany).toHaveBeenCalledWith({
            where: { fabrico_id: 10 },
            orderBy: { nome: "asc" },
        });
    });

    it("busca uma cor existente", async () => {
        prisma.cor.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });

        await expect(service.findOne(1, user)).resolves.toEqual({ id: 1, fabrico_id: 10 });
    });

    it("rejeita cor inexistente", async () => {
        prisma.cor.findUnique.mockResolvedValue(null);

        await expect(service.findOne(1, user)).rejects.toThrow(
            new NotFoundException("Cor não encontrada"),
        );
    });

    it("atualiza cor existente", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({
            id: 1,
            nome: "azul",
            codigo_hex: "#00f",
            fabrico_id: 10,
        } as any);
        prisma.cor.findFirst.mockResolvedValue(null);
        prisma.cor.update.mockResolvedValue({ id: 1, nome: "verde" });

        await expect(service.update(1, { nome: " Verde " }, user)).resolves.toEqual({
            message: "Cor atualizada com sucesso",
            data: { id: 1, nome: "verde" },
        });
    });

    it("rejeita update com nome duplicado", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({
            id: 1,
            nome: "azul",
            fabrico_id: 10,
        } as any);
        prisma.cor.findFirst.mockResolvedValue({ id: 2 });

        await expect(service.update(1, { nome: "Azul" }, user)).rejects.toThrow(
            new ConflictException("Já existe uma cor com esse nome nesse fabrico"),
        );
    });

    it("remove cor existente", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1 } as any);
        prisma.cor.delete.mockResolvedValue({ id: 1 });

        await expect(service.remove(1, user)).resolves.toEqual({
            message: "Cor removida com sucesso",
            data: { id: 1 },
        });
    });

    it("rejeita remoção de cor em uso", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1 } as any);
        prisma.cor.delete.mockRejectedValue(
            new PrismaClientKnownRequestError("fk", {
                code: "P2003",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.remove(1, user)).rejects.toThrow(
            new ConflictException("Não foi possível remover a cor porque ela está em uso"),
        );
    });

    it("retorna 404 para cor de outro fabrico", async () => {
        prisma.cor.findUnique.mockResolvedValue({ id: 1, fabrico_id: 11 });

        await expect(service.findOne(1, user)).rejects.toThrow(
            new NotFoundException("Cor não encontrada"),
        );
    });
});
