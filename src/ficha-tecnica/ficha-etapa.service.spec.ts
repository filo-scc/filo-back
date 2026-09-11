import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
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
            $transaction: jest.fn(async (callback) => callback(prisma)),
            fichaEtapa: {
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                create: jest.fn(),
                delete: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
            },
            fichaTecnica: { updateMany: jest.fn() },
            etapa: { findFirst: jest.fn() },
        };
        fichaTecnicaService = {
            findOne: jest.fn().mockImplementation((id) => ({ id, fabrico_id: 30 })),
        };
        etapaService = {
            getById: jest.fn().mockImplementation((id) => ({ id, fabrico_id: 30 })),
        };
        prisma.etapa.findFirst.mockResolvedValue({ id: 999 });
        service = new FichaEtapaService(prisma, fichaTecnicaService, etapaService);
    });

    it("cria vínculo entre ficha técnica e etapa", async () => {
        prisma.fichaEtapa.findUnique.mockResolvedValue(null);
        prisma.fichaEtapa.create.mockResolvedValue({ id: 1 });

        await expect(
            service.createFichaEtapa({ ficha_tecnica_id: 10, etapa_id: 20 } as any, 30),
        ).resolves.toEqual({ id: 1 });
        expect(fichaTecnicaService.findOne).toHaveBeenCalledWith(10, 30);
        expect(etapaService.getById).toHaveBeenCalledWith(20);
        expect(prisma.fichaEtapa.create).toHaveBeenCalledWith({
            data: {
                ficha_tecnica_id: 10,
                etapa_id: 20,
                data_inicio: expect.any(Date),
            },
        });
        expect(prisma.fichaTecnica.updateMany).not.toHaveBeenCalled();
    });

    it("registra uma única vez o instante de produção ao entrar na última etapa", async () => {
        const dataInicioInformadaPeloCliente = "2026-08-25T10:00:00.000Z";
        const instanteServidor = new Date("2026-08-28T00:30:00.000Z");
        jest.useFakeTimers().setSystemTime(instanteServidor);
        prisma.fichaEtapa.findUnique.mockResolvedValue(null);
        prisma.fichaEtapa.create.mockResolvedValue({ id: 1 });
        prisma.etapa.findFirst.mockResolvedValue({ id: 20 });

        try {
            await service.createFichaEtapa(
                {
                    ficha_tecnica_id: 10,
                    etapa_id: 20,
                    data_inicio: dataInicioInformadaPeloCliente,
                } as any,
                30,
            );
        } finally {
            jest.useRealTimers();
        }

        expect(prisma.fichaTecnica.updateMany).toHaveBeenCalledWith({
            where: { id: 10, produzida_em: null },
            data: { produzida_em: instanteServidor },
        });
        expect(prisma.fichaEtapa.create).toHaveBeenCalledWith({
            data: {
                ficha_tecnica_id: 10,
                etapa_id: 20,
                data_inicio: instanteServidor,
            },
        });
    });

    it("rejeita vínculo duplicado", async () => {
        prisma.fichaEtapa.findUnique.mockResolvedValue({ id: 1 });

        await expect(
            service.createFichaEtapa({ ficha_tecnica_id: 10, etapa_id: 20 } as any, 30),
        ).rejects.toThrow(
            new ConflictException("Esta etapa já está vinculada a esta ficha técnica"),
        );
    });

    it("rejeita vínculo entre ficha técnica e etapa de fábricas diferentes", async () => {
        fichaTecnicaService.findOne.mockResolvedValue({ id: 10, fabrico_id: 30 });
        etapaService.getById.mockResolvedValue({ id: 20, fabrico_id: 99 });

        await expect(
            service.createFichaEtapa({ ficha_tecnica_id: 10, etapa_id: 20 } as any, 30),
        ).rejects.toThrow(
            new NotFoundException("A etapa não pertence ao mesmo fabrico da ficha técnica"),
        );
        expect(prisma.fichaEtapa.findUnique).not.toHaveBeenCalled();
        expect(prisma.fichaEtapa.create).not.toHaveBeenCalled();
        expect(prisma.fichaTecnica.updateMany).not.toHaveBeenCalled();
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
            service.createFichaEtapa({ ficha_tecnica_id: 10, etapa_id: 20 } as any, 30),
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
            service.createFichaEtapa({ ficha_tecnica_id: 10, etapa_id: 20 } as any, 30),
        ).rejects.toThrow(new NotFoundException("Ficha Etapa não encontrado"));
    });

    it("remove vínculo existente", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue({ id: 1 });
        prisma.fichaEtapa.delete.mockResolvedValue({ id: 1 });

        await expect(service.deleteFichaEtapa(1, 30)).resolves.toEqual({ id: 1 });
        expect(prisma.fichaEtapa.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("rejeita remoção de vínculo inexistente", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue(null);

        await expect(service.deleteFichaEtapa(1, 30)).rejects.toThrow(
            new NotFoundException("FichaEtapa não encontrada"),
        );
    });

    it("lista vínculos por ficha técnica", async () => {
        prisma.fichaEtapa.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.getByFichaTecnica(10, 30)).resolves.toEqual([{ id: 1 }]);
        expect(fichaTecnicaService.findOne).toHaveBeenCalledWith(10, 30);
        expect(prisma.fichaEtapa.findMany).toHaveBeenCalledWith({
            where: { ficha_tecnica_id: 10 },
            include: { etapa: true },
        });
    });

    it("lista vínculos por etapa", async () => {
        prisma.fichaEtapa.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.getByEtapa(20, 30)).resolves.toEqual([{ id: 1 }]);
        expect(etapaService.getById).toHaveBeenCalledWith(20);
        expect(prisma.fichaEtapa.findMany).toHaveBeenCalledWith({
            where: { etapa_id: 20, ficha_tecnica: { fabrico_id: 30 } },
            include: { ficha_tecnica: true },
        });
    });

    it("rejeita listagem por etapa de outro fabrico", async () => {
        etapaService.getById.mockResolvedValue({ id: 20, fabrico_id: 99 });

        await expect(service.getByEtapa(20, 30)).rejects.toThrow(
            new NotFoundException("A etapa não pertence ao mesmo fabrico da ficha técnica"),
        );
        expect(prisma.fichaEtapa.findMany).not.toHaveBeenCalled();
    });

    it("atualiza apenas os campos permitidos (observacoes, data_inicio, data_fim)", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
        });
        prisma.fichaEtapa.update.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
            observacoes: "novo texto",
        });

        await expect(
            service.updateFichaEtapa(1, { observacoes: "novo texto" } as any, 30),
        ).resolves.toEqual({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
            observacoes: "novo texto",
        });

        expect(prisma.fichaEtapa.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: {
                observacoes: "novo texto",
                data_inicio: undefined,
                data_fim: undefined,
            },
        });
    });

    it("usa o relógio do servidor ao encerrar uma etapa", async () => {
        const instanteServidor = new Date("2026-08-28T00:30:00.000Z");
        const fichaAberta = {
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
            data_fim: null,
        };
        const fichaFinalizada = { ...fichaAberta, data_fim: instanteServidor };
        jest.useFakeTimers().setSystemTime(instanteServidor);
        prisma.fichaEtapa.findFirst
            .mockResolvedValueOnce(fichaAberta)
            .mockResolvedValueOnce(fichaFinalizada);

        try {
            await expect(service.finalizarFichaEtapa(1, 30)).resolves.toEqual(fichaFinalizada);
        } finally {
            jest.useRealTimers();
        }

        expect(prisma.fichaEtapa.updateMany).toHaveBeenCalledWith({
            where: { id: 1, data_fim: null },
            data: { data_fim: instanteServidor },
        });
    });

    it("preserva data_fim quando a etapa já está finalizada", async () => {
        const dataFimOriginal = new Date("2026-08-28T00:30:00.000Z");
        const fichaFinalizada = {
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
            data_fim: dataFimOriginal,
        };
        prisma.fichaEtapa.findFirst.mockResolvedValue(fichaFinalizada);

        await expect(service.finalizarFichaEtapa(1, 30)).resolves.toEqual(fichaFinalizada);

        expect(prisma.fichaEtapa.updateMany).not.toHaveBeenCalled();
    });

    it("ignora ficha_tecnica_id e etapa_id mesmo se vierem no payload", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
        });
        prisma.fichaEtapa.update.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
        });

        const payloadComCamposProibidos = {
            observacoes: "tentativa de burlar",
            ficha_tecnica_id: 999,
            etapa_id: 888,
        } as any;

        await service.updateFichaEtapa(1, payloadComCamposProibidos, 30);

        expect(prisma.fichaEtapa.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: {
                observacoes: "tentativa de burlar",
                data_inicio: undefined,
                data_fim: undefined,
            },
        });

        const dataEnviadaAoPrisma = prisma.fichaEtapa.update.mock.calls[0][0].data;
        expect(dataEnviadaAoPrisma).not.toHaveProperty("ficha_tecnica_id");
        expect(dataEnviadaAoPrisma).not.toHaveProperty("etapa_id");
    });

    it("não valida mais etapa/ficha técnica durante o update genérico", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
        });
        prisma.fichaEtapa.update.mockResolvedValue({ id: 1 });

        await service.updateFichaEtapa(1, { observacoes: "x" } as any, 30);

        expect(fichaTecnicaService.findOne).not.toHaveBeenCalled();
        expect(etapaService.getById).not.toHaveBeenCalled();
    });

    it("rejeita update de vínculo inexistente", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue(null);

        await expect(service.updateFichaEtapa(1, {} as any, 30)).rejects.toThrow(
            new NotFoundException("FichaEtapa não encontrada"),
        );
    });

    it("traduz conflito Prisma ao atualizar vínculo", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
        });
        prisma.fichaEtapa.update.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(service.updateFichaEtapa(1, { observacoes: "x" } as any, 30)).rejects.toThrow(
            new ConflictException("Ficha Etapa já cadastrada"),
        );
    });
});
