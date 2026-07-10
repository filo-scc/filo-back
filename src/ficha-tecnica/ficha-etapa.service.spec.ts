import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FichaEtapaService } from "./ficha-etapa.service";

const { PrismaClientKnownRequestError } = Prisma;

describe("FichaEtapaService", () => {
    let service: FichaEtapaService;
    let prisma: any;
    let fichaTecnicaService: any;
    let etapaService: any;

    beforeEach(() => {
        prisma = {
            fichaEtapa: {
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                create: jest.fn(),
                delete: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
            },
        };
        fichaTecnicaService = { findOne: jest.fn() };
        etapaService = { getById: jest.fn() };
        service = new FichaEtapaService(prisma, fichaTecnicaService, etapaService);
    });

    it("cria vínculo entre ficha técnica e etapa", async () => {
        prisma.fichaEtapa.findUnique.mockResolvedValue(null);
        prisma.fichaEtapa.create.mockResolvedValue({ id: 1 });

        await expect(
            service.createFichaEtapa({ ficha_tecnica_id: 10, etapa_id: 20 }),
        ).resolves.toEqual({ id: 1 });
        expect(fichaTecnicaService.findOne).toHaveBeenCalledWith(10);
        expect(etapaService.getById).toHaveBeenCalledWith(20);
        expect(prisma.fichaEtapa.create).toHaveBeenCalledWith({
            data: { ficha_tecnica_id: 10, etapa_id: 20 },
        });
    });

    it("rejeita vínculo duplicado", async () => {
        prisma.fichaEtapa.findUnique.mockResolvedValue({ id: 1 });

        await expect(
            service.createFichaEtapa({ ficha_tecnica_id: 10, etapa_id: 20 }),
        ).rejects.toThrow(
            new ConflictException("Esta etapa já está vinculada a esta ficha técnica"),
        );
    });

    it("traduz conflito Prisma ao criar vínculo", async () => {
        prisma.fichaEtapa.findUnique.mockResolvedValue(null);
        prisma.fichaEtapa.create.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(
            service.createFichaEtapa({ ficha_tecnica_id: 10, etapa_id: 20 }),
        ).rejects.toThrow(new ConflictException("Ficha Etapa já cadastrada"));
    });

    it("traduz relacionamento inexistente ao criar vínculo", async () => {
        prisma.fichaEtapa.findUnique.mockResolvedValue(null);
        prisma.fichaEtapa.create.mockRejectedValue(
            new PrismaClientKnownRequestError("fk", {
                code: "P2003",
                clientVersion: "7.0.0",
            }),
        );

        await expect(
            service.createFichaEtapa({ ficha_tecnica_id: 10, etapa_id: 20 }),
        ).rejects.toThrow(new NotFoundException("Ficha Etapa não encontrado"));
    });

    it("remove vínculo existente", async () => {
        prisma.fichaEtapa.findUnique.mockResolvedValue({ id: 1 });
        prisma.fichaEtapa.delete.mockResolvedValue({ id: 1 });

        await expect(service.deleteFichaEtapa(1)).resolves.toEqual({ id: 1 });
        expect(prisma.fichaEtapa.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("rejeita remoção de vínculo inexistente", async () => {
        prisma.fichaEtapa.findUnique.mockResolvedValue(null);

        await expect(service.deleteFichaEtapa(1)).rejects.toThrow(
            new NotFoundException("FichaEtapa não encontrada"),
        );
    });

    it("lista vínculos por ficha técnica", async () => {
        prisma.fichaEtapa.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.getByFichaTecnica(10)).resolves.toEqual([{ id: 1 }]);
        expect(fichaTecnicaService.findOne).toHaveBeenCalledWith(10);
        expect(prisma.fichaEtapa.findMany).toHaveBeenCalledWith({
            where: { ficha_tecnica_id: 10 },
            include: { etapa: true },
        });
    });

    it("lista vínculos por etapa", async () => {
        prisma.fichaEtapa.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.getByEtapa(20)).resolves.toEqual([{ id: 1 }]);
        expect(etapaService.getById).toHaveBeenCalledWith(20);
        expect(prisma.fichaEtapa.findMany).toHaveBeenCalledWith({
            where: { etapa_id: 20 },
            include: { ficha_tecnica: true },
        });
    });

    it("atualiza vínculo existente", async () => {
        prisma.fichaEtapa.findUnique.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
        });
        prisma.fichaEtapa.findFirst.mockResolvedValue(null);
        prisma.fichaEtapa.update.mockResolvedValue({ id: 1, etapa_id: 21 });

        await expect(service.updateFichaEtapa(1, { etapa_id: 21 })).resolves.toEqual({
            id: 1,
            etapa_id: 21,
        });
        expect(etapaService.getById).toHaveBeenCalledWith(21);
        expect(prisma.fichaEtapa.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { etapa_id: 21 },
        });
    });

    it("rejeita update de vínculo inexistente", async () => {
        prisma.fichaEtapa.findUnique.mockResolvedValue(null);

        await expect(service.updateFichaEtapa(1, {})).rejects.toThrow(
            new NotFoundException("FichaEtapa não encontrada"),
        );
    });

    it("rejeita update para vínculo duplicado", async () => {
        prisma.fichaEtapa.findUnique.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
        });
        prisma.fichaEtapa.findFirst.mockResolvedValue({ id: 2 });

        await expect(service.updateFichaEtapa(1, {})).rejects.toThrow(
            new ConflictException("Esta etapa já está vinculada a esta ficha técnica"),
        );
    });
});
