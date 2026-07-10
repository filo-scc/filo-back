import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AviamentoService } from "./aviamento.service";

const { PrismaClientKnownRequestError } = Prisma;

describe("AviamentoService", () => {
    let service: AviamentoService;
    let prisma: any;

    beforeEach(() => {
        prisma = {
            fabrico: { findUnique: jest.fn() },
            aviamento: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                delete: jest.fn(),
                update: jest.fn(),
            },
        };
        service = new AviamentoService(prisma);
    });

    it("cria aviamento para fabrico existente", async () => {
        prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
        prisma.aviamento.create.mockResolvedValue({ id: 1, nome: "botão" });

        await expect(service.create({ nome: "botão", fabrico_id: 10 })).resolves.toEqual({
            id: 1,
            nome: "botão",
        });
    });

    it("rejeita fabrico inexistente", async () => {
        prisma.fabrico.findUnique.mockResolvedValue(null);

        await expect(service.create({ nome: "botão", fabrico_id: 10 })).rejects.toThrow(
            new NotFoundException("Fabrico não encontrado!"),
        );
    });

    it("traduz nome duplicado ao criar", async () => {
        prisma.fabrico.findUnique.mockResolvedValue({ id: 10 });
        prisma.aviamento.create.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.create({ nome: "botão", fabrico_id: 10 })).rejects.toThrow(
            new ConflictException("Já existe um aviamento com este nome para este fabrico"),
        );
    });

    it("lista aviamentos", async () => {
        prisma.aviamento.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
    });

    it("busca aviamento existente", async () => {
        prisma.aviamento.findUnique.mockResolvedValue({ id: 1 });

        await expect(service.getById(1)).resolves.toEqual({ id: 1 });
    });

    it("rejeita aviamento inexistente", async () => {
        prisma.aviamento.findUnique.mockResolvedValue(null);

        await expect(service.getById(1)).rejects.toThrow(
            new NotFoundException("Aviamento não encontrado"),
        );
    });

    it("lista aviamentos por fabrico", async () => {
        prisma.aviamento.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAllFabrico(10)).resolves.toEqual([{ id: 1 }]);
        expect(prisma.aviamento.findMany).toHaveBeenCalledWith({ where: { fabrico_id: 10 } });
    });

    it("remove aviamento existente", async () => {
        prisma.aviamento.findUnique.mockResolvedValue({ id: 1 });
        prisma.aviamento.delete.mockResolvedValue({ id: 1 });

        await expect(service.delete(1)).resolves.toBe(
            "O aviamento com o id 1 foi deletado com sucesso",
        );
    });

    it("atualiza aviamento existente", async () => {
        prisma.aviamento.findUnique.mockResolvedValue({ id: 1 });
        prisma.aviamento.update.mockResolvedValue({ id: 1, nome: "zíper" });

        await expect(service.update(1, { nome: "zíper" })).resolves.toEqual({
            id: 1,
            nome: "zíper",
        });
    });

    it("traduz nome duplicado ao atualizar", async () => {
        prisma.aviamento.findUnique.mockResolvedValue({ id: 1 });
        prisma.aviamento.update.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.update(1, { nome: "botão" })).rejects.toThrow(
            new ConflictException("Já existe um aviamento com este nome para este fabrico"),
        );
    });
});
