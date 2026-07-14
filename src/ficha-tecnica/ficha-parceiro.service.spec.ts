import { ConflictException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FichaParceiroService } from "./ficha-parceiro.service";

const { PrismaClientKnownRequestError } = Prisma;

describe("FichaParceiroService", () => {
    let service: FichaParceiroService;
    let prisma: any;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
        prisma = {
            fichaTecnica: { findUnique: jest.fn() },
            parceiro: { findUnique: jest.fn() },
            fichaParceiro: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
        };
        service = new FichaParceiroService(prisma);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("cria vínculo entre ficha e parceiro do mesmo fabrico", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.parceiro.findUnique.mockResolvedValue({ id: 2, fabrico_id: 10 });
        prisma.fichaParceiro.create.mockResolvedValue({ ficha_id: 1, parceiro_id: 2 });

        await expect(
            service.create({ ficha_id: 1, parceiro_id: 2, valor: 12, quantidade: 3 }, 10),
        ).resolves.toEqual({ ficha_id: 1, parceiro_id: 2 });
        expect(prisma.fichaParceiro.create).toHaveBeenCalledWith({
            data: {
                operacao: undefined,
                valor: 12,
                ficha_id: 1,
                parceiro_id: 2,
                quantidade: 3,
            },
        });
    });

    it("rejeita ficha inexistente ou de outro fabrico", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue({ id: 1, fabrico_id: 11 });

        await expect(service.create({ ficha_id: 1, parceiro_id: 2 }, 10)).rejects.toThrow(
            new NotFoundException(
                "Ficha Técnica não encontrada ou o fabrico não possui essa ficha",
            ),
        );
    });

    it("rejeita parceiro inexistente ou de outro fabrico", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.parceiro.findUnique.mockResolvedValue(null);

        await expect(service.create({ ficha_id: 1, parceiro_id: 2 }, 10)).rejects.toThrow(
            new NotFoundException("Parceiro não encontrado ou o fabrico não possui esse parceiro"),
        );
    });

    it("traduz vínculo duplicado ao criar", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.parceiro.findUnique.mockResolvedValue({ id: 2, fabrico_id: 10 });
        prisma.fichaParceiro.create.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.create({ ficha_id: 1, parceiro_id: 2 }, 10)).rejects.toThrow(
            new ConflictException("Este parceiro já está vinculado a esta ficha técnica"),
        );
    });

    it("traduz erro inesperado ao criar", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.parceiro.findUnique.mockResolvedValue({ id: 2, fabrico_id: 10 });
        prisma.fichaParceiro.create.mockRejectedValue(new Error("db"));

        await expect(service.create({ ficha_id: 1, parceiro_id: 2 }, 10)).rejects.toThrow(
            new InternalServerErrorException("Erro ao vincular parceiro à ficha técnica"),
        );
    });

    it("lista todos os vínculos", async () => {
        prisma.fichaParceiro.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.getAll()).resolves.toEqual([{ id: 1 }]);
        expect(prisma.fichaParceiro.findMany).toHaveBeenCalledWith({
            include: { ficha: true, parceiro: true },
        });
    });

    it("busca um vínculo existente validando o fabrico", async () => {
        prisma.fichaParceiro.findUnique.mockResolvedValue({
            ficha_id: 1,
            parceiro_id: 2,
            ficha: { fabrico_id: 10 },
        });

        await expect(service.findOne(1, 2, 10)).resolves.toEqual({
            ficha_id: 1,
            parceiro_id: 2,
            ficha: { fabrico_id: 10 },
        });
    });

    it("rejeita vínculo inexistente ou fora do fabrico", async () => {
        prisma.fichaParceiro.findUnique.mockResolvedValue(null);

        await expect(service.findOne(1, 2, 10)).rejects.toThrow(
            new NotFoundException(
                "Essa relacionamento entre ficha e parceiro não existe ou o fabrico não a possui",
            ),
        );
    });

    it("atualiza vínculo existente", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ ficha_id: 1, parceiro_id: 2 } as any);
        prisma.fichaParceiro.update.mockResolvedValue({ valor: 20 });

        await expect(service.update(1, 2, { valor: 20 }, 10)).resolves.toEqual({ valor: 20 });
        expect(prisma.fichaParceiro.update).toHaveBeenCalledWith({
            where: { ficha_id_parceiro_id: { ficha_id: 1, parceiro_id: 2 } },
            data: { operacao: undefined, valor: 20, quantidade: undefined },
        });
    });

    it("remove vínculo existente", async () => {
        jest.spyOn(service, "findOne").mockResolvedValue({ ficha_id: 1, parceiro_id: 2 } as any);
        prisma.fichaParceiro.delete.mockResolvedValue({});

        await expect(service.remove(1, 2, 10)).resolves.toBe(
            "Relacionamento entre ficha 1 e parceiro 2 foi removida com sucesso",
        );
    });

    it("lista parceiros por ficha validando fabrico", async () => {
        prisma.fichaTecnica.findUnique.mockResolvedValue({ id: 1, fabrico_id: 10 });
        prisma.fichaParceiro.findMany.mockResolvedValue([{ parceiro: { id: 2 } }]);

        await expect(service.getFichaParceiroByFicha(1, 10)).resolves.toEqual([
            { parceiro: { id: 2 } },
        ]);
        expect(prisma.fichaParceiro.findMany).toHaveBeenCalledWith({
            where: { ficha_id: 1 },
            include: { parceiro: true },
        });
    });

    it("lista fichas por parceiro validando fabrico", async () => {
        prisma.parceiro.findUnique.mockResolvedValue({ id: 2, fabrico_id: 10 });
        prisma.fichaParceiro.findMany.mockResolvedValue([{ ficha: { id: 1 } }]);

        await expect(service.getFichaParceiroByParceiro(2, 10)).resolves.toEqual([
            { ficha: { id: 1 } },
        ]);
        expect(prisma.fichaParceiro.findMany).toHaveBeenCalledWith({
            where: { parceiro_id: 2 },
            include: { ficha: true },
        });
    });
});
