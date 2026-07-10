import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { IconeService } from "./icone.service";

const { PrismaClientKnownRequestError } = Prisma;

describe("IconeService", () => {
    let service: IconeService;
    let prisma: any;

    beforeEach(() => {
        prisma = {
            icone: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            etapa: { count: jest.fn() },
        };
        service = new IconeService(prisma);
    });

    it("cria ícone", async () => {
        prisma.icone.create.mockResolvedValue({ id: 1, nome: "costura" });

        await expect(service.create({ nome: "costura", url: "icone.svg" } as any)).resolves.toEqual(
            {
                id: 1,
                nome: "costura",
            },
        );
    });

    it("traduz ícone duplicado ao criar", async () => {
        prisma.icone.create.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.create({ nome: "costura" } as any)).rejects.toThrow(
            new ConflictException("Icone já cadastrado"),
        );
    });

    it("lista ícones", async () => {
        prisma.icone.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.getAll()).resolves.toEqual([{ id: 1 }]);
    });

    it("busca ícone existente", async () => {
        prisma.icone.findUnique.mockResolvedValue({ id: 1 });

        await expect(service.getById(1)).resolves.toEqual({ id: 1 });
    });

    it("rejeita ícone inexistente", async () => {
        prisma.icone.findUnique.mockResolvedValue(null);

        await expect(service.getById(1)).rejects.toThrow(
            new NotFoundException("Icone não encontrado"),
        );
    });

    it("atualiza ícone existente", async () => {
        jest.spyOn(service, "getById").mockResolvedValue({ id: 1 } as any);
        prisma.icone.update.mockResolvedValue({ id: 1, nome: "novo" });

        await expect(service.update(1, { nome: "novo" } as any)).resolves.toEqual({
            id: 1,
            nome: "novo",
        });
    });

    it("traduz ícone duplicado ao atualizar", async () => {
        jest.spyOn(service, "getById").mockResolvedValue({ id: 1 } as any);
        prisma.icone.update.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.update(1, { nome: "novo" } as any)).rejects.toThrow(
            new ConflictException("Icone já cadastrado"),
        );
    });

    it("remove ícone existente", async () => {
        prisma.icone.findUnique.mockResolvedValue({ id: 1 });
        prisma.icone.delete.mockResolvedValue({ id: 1 });

        await expect(service.delete(1)).resolves.toEqual({ id: 1 });
    });

    it("rejeita remoção de ícone inexistente", async () => {
        prisma.icone.findUnique.mockResolvedValue(null);

        await expect(service.delete(1)).rejects.toThrow(
            new NotFoundException("Ícone não encontrado"),
        );
    });

    it("traduz remoção de ícone vinculado a etapas", async () => {
        prisma.icone.findUnique.mockResolvedValue({ id: 1 });
        prisma.icone.delete.mockRejectedValue(
            new PrismaClientKnownRequestError("fk", {
                code: "P2003",
                clientVersion: "7.0.0",
            }),
        );
        prisma.etapa.count.mockResolvedValue(2);

        await expect(service.delete(1)).rejects.toThrow(
            new ConflictException("Não é possível excluir: ícone está vinculado a 2 etapa(s)"),
        );
    });
});
