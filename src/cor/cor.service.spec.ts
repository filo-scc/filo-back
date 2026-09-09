import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CorService } from "./cor.service";

const { PrismaClientKnownRequestError } = Prisma;

jest.mock("src/common/utils/string-normalizer", () => ({
    normalizeText: jest.fn((text: string) => text.trim()),
}));

describe("CorService", () => {
    let service: CorService;
    let prisma: any;
    const userFabricoId = 10;

    beforeEach(() => {
        prisma = {
            cor: {
                findFirst: jest.fn(),
                create: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
        };
        service = new CorService(prisma);
    });

    describe("create", () => {
        it("cria cor normalizando o nome", async () => {
            prisma.cor.findFirst.mockResolvedValue(null);
            prisma.cor.create.mockResolvedValue({
                id: 1,
                nome: "Azul",
                codigo_hex: "#00f",
                fabrico_id: userFabricoId,
            });

            const dto = { nome: " Azul ", codigo_hex: "#00f", fabrico_id: userFabricoId };

            await expect(service.create(dto as any, userFabricoId)).resolves.toEqual({
                message: "Cor criada com sucesso",
                data: { id: 1, nome: "Azul", codigo_hex: "#00f", fabrico_id: userFabricoId },
            });

            expect(prisma.cor.create).toHaveBeenCalledWith({
                data: {
                    nome: "Azul",
                    codigo_hex: "#00f",
                    fabrico_id: userFabricoId,
                },
            });
        });

        it("impede alteração do fabrico_id via DTO", async () => {
            await expect(
                service.create({ nome: "Azul", fabrico_id: 99 } as any, userFabricoId),
            ).rejects.toThrow(new BadRequestException("Não é permitido alterar o fabrico da cor"));
        });

        it("rejeita cor duplicada no fabrico", async () => {
            prisma.cor.findFirst.mockResolvedValue({ id: 1 });

            await expect(service.create({ nome: "Azul" } as any, userFabricoId)).rejects.toThrow(
                new ConflictException("Já existe uma cor com esse nome nesse fabrico"),
            );
        });

        it("traduz erro P2002 do Prisma no create", async () => {
            prisma.cor.findFirst.mockResolvedValue(null);
            prisma.cor.create.mockRejectedValue(
                new PrismaClientKnownRequestError("duplicado", {
                    code: "P2002",
                    clientVersion: "5.0.0",
                }),
            );

            await expect(service.create({ nome: "Azul" } as any, userFabricoId)).rejects.toThrow(
                new ConflictException("Já existe uma cor com este nome para este fabrico"),
            );
        });

        it("traduz erro P2003 do Prisma no create", async () => {
            prisma.cor.findFirst.mockResolvedValue(null);
            prisma.cor.create.mockRejectedValue(
                new PrismaClientKnownRequestError("relacao_invalida", {
                    code: "P2003",
                    clientVersion: "5.0.0",
                }),
            );

            await expect(service.create({ nome: "Azul" } as any, userFabricoId)).rejects.toThrow(
                new NotFoundException("Relacionamento inválido"),
            );
        });
    });

    describe("findAll", () => {
        it("lista cores do fabrico do usuário", async () => {
            prisma.cor.findMany.mockResolvedValue([{ id: 1, nome: "Azul" }]);

            await expect(service.findAll(userFabricoId)).resolves.toEqual([
                { id: 1, nome: "Azul" },
            ]);
            expect(prisma.cor.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: userFabricoId },
                orderBy: { nome: "asc" },
            });
        });

        it("lista cores informando fabrico_id explicitamente", async () => {
            prisma.cor.findMany.mockResolvedValue([{ id: 1, nome: "Azul" }]);

            await expect(service.findAllByFabricoID(userFabricoId)).resolves.toEqual([
                { id: 1, nome: "Azul" },
            ]);
            expect(prisma.cor.findMany).toHaveBeenCalledWith({
                where: { fabrico_id: userFabricoId },
                orderBy: { nome: "asc" },
            });
        });
    });

    describe("findOne", () => {
        it("busca uma cor existente usando findFirst", async () => {
            prisma.cor.findFirst.mockResolvedValue({ id: 1, fabrico_id: userFabricoId });

            await expect(service.findOne(1, userFabricoId)).resolves.toEqual({
                id: 1,
                fabrico_id: userFabricoId,
            });
            expect(prisma.cor.findFirst).toHaveBeenCalledWith({
                where: { id: 1, fabrico_id: userFabricoId },
            });
        });

        it("rejeita cor inexistente", async () => {
            prisma.cor.findFirst.mockResolvedValue(null);

            await expect(service.findOne(1, userFabricoId)).rejects.toThrow(
                new NotFoundException("Cor não encontrada"),
            );
        });
    });

    describe("update", () => {
        it("atualiza cor existente", async () => {
            prisma.cor.findFirst
                .mockResolvedValueOnce({ id: 1, nome: "azul", fabrico_id: userFabricoId }) // findOne
                .mockResolvedValueOnce(null); // verificação de nome existente

            prisma.cor.update.mockResolvedValue({
                id: 1,
                nome: "Verde",
                fabrico_id: userFabricoId,
            });

            await expect(service.update(1, { nome: " Verde " }, userFabricoId)).resolves.toEqual({
                message: "Cor atualizada com sucesso",
                data: { id: 1, nome: "Verde", fabrico_id: userFabricoId },
            });
        });

        it("rejeita update com nome duplicado em outro registro", async () => {
            prisma.cor.findFirst
                .mockResolvedValueOnce({ id: 1, nome: "azul", fabrico_id: userFabricoId }) // findOne
                .mockResolvedValueOnce({ id: 2, nome: "Verde", fabrico_id: userFabricoId }); // cor com mesmo nome

            await expect(service.update(1, { nome: "Verde" }, userFabricoId)).rejects.toThrow(
                new ConflictException("Já existe uma cor com esse nome nesse fabrico"),
            );
        });
    });

    describe("remove", () => {
        it("remove cor existente", async () => {
            prisma.cor.findFirst.mockResolvedValue({ id: 1, fabrico_id: userFabricoId });
            prisma.cor.delete.mockResolvedValue({ id: 1 });

            await expect(service.remove(1, userFabricoId)).resolves.toEqual({
                message: "Cor removida com sucesso",
                data: { id: 1 },
            });
        });

        it("rejeita remoção de cor em uso (P2003)", async () => {
            prisma.cor.findFirst.mockResolvedValue({ id: 1, fabrico_id: userFabricoId });
            prisma.cor.delete.mockRejectedValue(
                new PrismaClientKnownRequestError("fk", {
                    code: "P2003",
                    clientVersion: "5.0.0",
                }),
            );

            await expect(service.remove(1, userFabricoId)).rejects.toThrow(
                new ConflictException("Não foi possível remover a cor porque ela está em uso"),
            );
        });
    });
});
