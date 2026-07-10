import { NotFoundException } from "@nestjs/common";
import { EnderecoService } from "./endereco.service";

describe("EnderecoService", () => {
    let service: EnderecoService;
    let prisma: any;

    beforeEach(() => {
        prisma = {
            endereco: {
                create: jest.fn(),
                update: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
            },
        };
        service = new EnderecoService(prisma);
    });

    it("cria endereço", async () => {
        prisma.endereco.create.mockResolvedValue({ id: 1, cidade: "Recife" });

        await expect(service.create({ cidade: "Recife" } as any)).resolves.toEqual({
            id: 1,
            cidade: "Recife",
        });
        expect(prisma.endereco.create).toHaveBeenCalledWith({ data: { cidade: "Recife" } });
    });

    it("atualiza endereço existente", async () => {
        jest.spyOn(service, "findById").mockResolvedValue({ id: 1 } as any);
        prisma.endereco.update.mockResolvedValue({ id: 1, cidade: "Olinda" });

        await expect(service.update(1, { cidade: "Olinda" } as any)).resolves.toEqual({
            id: 1,
            cidade: "Olinda",
        });
    });

    it("lista endereços", async () => {
        prisma.endereco.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
    });

    it("busca por id", async () => {
        prisma.endereco.findUnique.mockResolvedValue({ id: 1 });

        await expect(service.findById(1)).resolves.toEqual({ id: 1 });
    });

    it("rejeita id inexistente", async () => {
        prisma.endereco.findUnique.mockResolvedValue(null);

        await expect(service.findById(1)).rejects.toThrow(
            new NotFoundException("Endereço 1 não encontrado."),
        );
    });

    it("busca por usuário", async () => {
        prisma.endereco.findUnique.mockResolvedValue({ id: 1, usuario_id: 2 });

        await expect(service.findByUsuarioId(2)).resolves.toEqual({ id: 1, usuario_id: 2 });
    });

    it("rejeita usuário sem endereço", async () => {
        prisma.endereco.findUnique.mockResolvedValue(null);

        await expect(service.findByUsuarioId(2)).rejects.toThrow(
            new NotFoundException("Endereço para o usuário 2 não encontrado."),
        );
    });

    it("busca por parceiro", async () => {
        prisma.endereco.findUnique.mockResolvedValue({ id: 1, parceiro_id: 3 });

        await expect(service.findByParceiroId(3)).resolves.toEqual({ id: 1, parceiro_id: 3 });
    });

    it("rejeita parceiro sem endereço", async () => {
        prisma.endereco.findUnique.mockResolvedValue(null);

        await expect(service.findByParceiroId(3)).rejects.toThrow(
            new NotFoundException("Endereço para o parceiro 3 não encontrado."),
        );
    });
});
