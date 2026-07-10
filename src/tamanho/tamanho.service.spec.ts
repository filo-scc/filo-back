import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TamanhoService } from "./tamanho.service";

const { PrismaClientKnownRequestError, PrismaClientValidationError } = Prisma;

describe("TamanhoService", () => {
    let service: TamanhoService;
    let prisma: any;

    beforeEach(() => {
        prisma = {
            tamanho: {
                findFirst: jest.fn(),
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
        };
        service = new TamanhoService(prisma);
    });

    it("cria tamanho normalizando código", async () => {
        prisma.tamanho.findFirst.mockResolvedValue(null);
        prisma.tamanho.create.mockResolvedValue({ id: 1, codigo: "PP" });

        await expect(service.create({ codigo: " pp ", ordem_global: 1 })).resolves.toEqual({
            message: "Tamanho criado com sucesso",
            data: { id: 1, codigo: "PP" },
        });
        expect(prisma.tamanho.create).toHaveBeenCalledWith({
            data: { codigo: "PP", ordem_global: 1 },
        });
    });

    it("rejeita tamanho duplicado", async () => {
        prisma.tamanho.findFirst.mockResolvedValue({ id: 1 });

        await expect(service.create({ codigo: "PP" } as any)).rejects.toThrow(
            new ConflictException("Tamanho já existe"),
        );
    });

    it("traduz conflito Prisma ao criar", async () => {
        prisma.tamanho.findFirst.mockResolvedValue(null);
        prisma.tamanho.create.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.create({ codigo: "PP" } as any)).rejects.toThrow(
            new ConflictException("Conflito ao criar tamanho"),
        );
    });

    it("traduz validação Prisma ao criar", async () => {
        prisma.tamanho.findFirst.mockResolvedValue(null);
        prisma.tamanho.create.mockRejectedValue(
            new PrismaClientValidationError("invalid", { clientVersion: "7.0.0" }),
        );

        await expect(service.create({ codigo: "PP" } as any)).rejects.toThrow(
            new BadRequestException("Dados inválidos"),
        );
    });

    it("lista tamanhos", async () => {
        prisma.tamanho.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
        expect(prisma.tamanho.findMany).toHaveBeenCalledWith({
            orderBy: [{ ordem_global: "asc" }, { codigo: "asc" }],
        });
    });

    it("busca tamanho existente", async () => {
        prisma.tamanho.findUnique.mockResolvedValue({ id: 1 });

        await expect(service.findOne(1)).resolves.toEqual({ id: 1 });
    });

    it("rejeita tamanho inexistente", async () => {
        prisma.tamanho.findUnique.mockResolvedValue(null);

        await expect(service.findOne(1)).rejects.toThrow(
            new NotFoundException("Tamanho não encontrado"),
        );
    });

    it("atualiza tamanho existente", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1, codigo: "PP", ordem_global: 1 } as any);
        prisma.tamanho.findFirst.mockResolvedValue(null);
        prisma.tamanho.update.mockResolvedValue({ id: 1, codigo: "P" });

        await expect(service.update(1, { codigo: " p " })).resolves.toEqual({
            message: "Tamanho atualizado com sucesso",
            data: { id: 1, codigo: "P" },
        });
        expect(prisma.tamanho.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { codigo: "P", ordem_global: 1 },
        });
    });

    it("rejeita update com código duplicado", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1, codigo: "PP", ordem_global: 1 } as any);
        prisma.tamanho.findFirst.mockResolvedValue({ id: 2 });

        await expect(service.update(1, { codigo: "P" })).rejects.toThrow(
            new ConflictException("Já existe um tamanho com esse código"),
        );
    });

    it("remove tamanho existente", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1 } as any);
        prisma.tamanho.delete.mockResolvedValue({ id: 1 });

        await expect(service.remove(1)).resolves.toEqual({
            message: "Tamanho removido com sucesso",
            data: { id: 1 },
        });
    });

    it("rejeita remoção de tamanho em uso", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ id: 1 } as any);
        prisma.tamanho.delete.mockRejectedValue(
            new PrismaClientKnownRequestError("fk", {
                code: "P2003",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.remove(1)).rejects.toThrow(
            new ConflictException("Não foi possível remover o tamanho porque ele está em uso"),
        );
    });
});
