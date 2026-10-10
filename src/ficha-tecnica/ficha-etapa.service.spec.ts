import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FichaEtapaService } from "./ficha-etapa.service";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

const { PrismaClientKnownRequestError } = Prisma;

describe("FichaEtapaService", () => {
    let service: FichaEtapaService;
    let prisma: any;
    let fichaTecnicaService: any;
    let etapaService: any;
    const gerenteFabrico30: AuthenticatedUser = {
        id: 10,
        email: "gerente@filo.test",
        nome: "Gerente",
        foto_de_perfil: null,
        cargo: "GERENTE",
        fabrico_id: 30,
        fabrico: { id: 30, ativo: true },
    };
    const admin: AuthenticatedUser = {
        id: 99,
        email: "admin@filo.test",
        nome: "Admin",
        foto_de_perfil: null,
        cargo: "ADMIN",
        fabrico_id: null,
        fabrico: null,
    };

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
            getById: jest
                .fn()
                .mockImplementation((id, fabricoId) => ({ id, fabrico_id: fabricoId })),
        };
        prisma.etapa.findFirst.mockResolvedValue({ id: 999 });
        service = new FichaEtapaService(prisma, fichaTecnicaService, etapaService);
    });

    it("remove vínculo existente", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue({
            id: 1,
            ficha_tecnica: { fabrico_id: 30 },
        });
        prisma.fichaEtapa.delete.mockResolvedValue({ id: 1 });

        await expect(service.deleteFichaEtapa(1, gerenteFabrico30)).resolves.toEqual({ id: 1 });
        expect(prisma.fichaEtapa.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("rejeita remoção de vínculo inexistente", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue(null);

        await expect(service.deleteFichaEtapa(1, gerenteFabrico30)).rejects.toThrow(
            new NotFoundException("FichaEtapa não encontrada"),
        );
    });

    it("lista vínculos por ficha técnica", async () => {
        prisma.fichaEtapa.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.getByFichaTecnica(10, gerenteFabrico30)).resolves.toEqual([{ id: 1 }]);
        expect(fichaTecnicaService.findOne).toHaveBeenCalledWith(10, 30);
        expect(prisma.fichaEtapa.findMany).toHaveBeenCalledWith({
            where: { ficha_tecnica_id: 10 },
            include: { etapa: true },
        });
    });

    it("lista vínculos por etapa", async () => {
        prisma.fichaEtapa.findMany.mockResolvedValue([{ id: 1 }]);

        await expect(service.getByEtapa(20, gerenteFabrico30)).resolves.toEqual([{ id: 1 }]);
        expect(etapaService.getById).toHaveBeenCalledWith(20, 30);
        expect(prisma.fichaEtapa.findMany).toHaveBeenCalledWith({
            where: { etapa_id: 20, ficha_tecnica: { fabrico_id: 30 } },
            include: { ficha_tecnica: true },
        });
    });

    it("rejeita listagem por etapa de outro fabrico", async () => {
        etapaService.getById.mockRejectedValue(new NotFoundException("Etapa não encontrada"));

        await expect(service.getByEtapa(20, gerenteFabrico30)).rejects.toThrow(
            new NotFoundException("Etapa não encontrada"),
        );
        expect(prisma.fichaEtapa.findMany).not.toHaveBeenCalled();
    });

    it("atualiza apenas os campos permitidos (observacoes, data_inicio, data_fim)", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
            ficha_tecnica: { fabrico_id: 30 },
        });
        prisma.fichaEtapa.update.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
            observacoes: "novo texto",
        });

        await expect(
            service.updateFichaEtapa(1, { observacoes: "novo texto" } as any, gerenteFabrico30),
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
            ficha_tecnica: { fabrico_id: 30 },
        };
        const fichaFinalizada = { ...fichaAberta, data_fim: instanteServidor };
        jest.useFakeTimers().setSystemTime(instanteServidor);
        prisma.fichaEtapa.findFirst
            .mockResolvedValueOnce(fichaAberta)
            .mockResolvedValueOnce(fichaFinalizada);

        try {
            await expect(service.finalizarFichaEtapa(1, gerenteFabrico30)).resolves.toEqual(
                fichaFinalizada,
            );
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
            ficha_tecnica: { fabrico_id: 30 },
        };
        prisma.fichaEtapa.findFirst.mockResolvedValue(fichaFinalizada);

        await expect(service.finalizarFichaEtapa(1, gerenteFabrico30)).resolves.toEqual(
            fichaFinalizada,
        );

        expect(prisma.fichaEtapa.updateMany).not.toHaveBeenCalled();
    });

    it("rejeita update para vínculo duplicado", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
            ficha_tecnica: { fabrico_id: 30 },
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

        await service.updateFichaEtapa(1, payloadComCamposProibidos, gerenteFabrico30);

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

    it("rejeita update por admin", async () => {
        await expect(service.updateFichaEtapa(1, {} as any, admin)).rejects.toThrow(
            ForbiddenException,
        );
        expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
    });

    it("não valida mais etapa/ficha técnica durante o update genérico", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
            ficha_tecnica: { fabrico_id: 30 },
        });
        prisma.fichaEtapa.update.mockResolvedValue({ id: 1 });

        await expect(service.updateFichaEtapa(1, { observacoes: "x" } as any, gerenteFabrico30));
        expect(fichaTecnicaService.findOne).not.toHaveBeenCalled();
        expect(etapaService.getById).not.toHaveBeenCalled();
    });

    describe("validação de datas no update (INV-KAN-005)", () => {
        const registro = (data_inicio: Date | null, data_fim: Date | null) => ({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
            data_inicio,
            data_fim,
            ficha_tecnica: { fabrico_id: 30 },
        });

        it("rejeita data_inicio posterior a data_fim enviadas juntas", async () => {
            prisma.fichaEtapa.findFirst.mockResolvedValue(registro(null, null));

            await expect(
                service.updateFichaEtapa(
                    1,
                    {
                        data_inicio: "2026-08-30T10:00:00.000Z",
                        data_fim: "2026-08-29T10:00:00.000Z",
                    },
                    gerenteFabrico30,
                ),
            ).rejects.toThrow(
                new BadRequestException("A data de início não pode ser posterior à data de fim"),
            );
            expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
        });

        it("rejeita data_inicio posterior à data_fim já gravada", async () => {
            prisma.fichaEtapa.findFirst.mockResolvedValue(
                registro(
                    new Date("2026-08-20T10:00:00.000Z"),
                    new Date("2026-08-25T10:00:00.000Z"),
                ),
            );

            await expect(
                service.updateFichaEtapa(
                    1,
                    { data_inicio: "2026-08-26T10:00:00.000Z" },
                    gerenteFabrico30,
                ),
            ).rejects.toThrow(BadRequestException);
            expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
        });

        it("rejeita data_fim anterior à data_inicio já gravada", async () => {
            prisma.fichaEtapa.findFirst.mockResolvedValue(
                registro(new Date("2026-08-20T10:00:00.000Z"), null),
            );

            await expect(
                service.updateFichaEtapa(
                    1,
                    { data_fim: "2026-08-19T10:00:00.000Z" },
                    gerenteFabrico30,
                ),
            ).rejects.toThrow(BadRequestException);
            expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
        });

        it("não reabre uma etapa encerrada: data_fim nula é conflito e nada é gravado", async () => {
            prisma.fichaEtapa.findFirst.mockResolvedValue(
                registro(
                    new Date("2026-08-20T10:00:00.000Z"),
                    new Date("2026-08-25T10:00:00.000Z"),
                ),
            );

            await expect(
                service.updateFichaEtapa(1, { data_fim: null } as any, gerenteFabrico30),
            ).rejects.toThrow(
                new ConflictException("Não é possível reabrir uma etapa já encerrada"),
            );
            expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
        });

        it("data_fim nula numa etapa que já está aberta não reabre nada e é aceita", async () => {
            prisma.fichaEtapa.findFirst.mockResolvedValue(
                registro(new Date("2026-08-20T10:00:00.000Z"), null),
            );
            prisma.fichaEtapa.update.mockResolvedValue({ id: 1 });

            await expect(
                service.updateFichaEtapa(1, { data_fim: null } as any, gerenteFabrico30),
            ).resolves.toEqual({ id: 1 });
            expect(prisma.fichaEtapa.update).toHaveBeenCalledTimes(1);
        });

        it("aceita datas coerentes (início anterior ao fim)", async () => {
            prisma.fichaEtapa.findFirst.mockResolvedValue(registro(null, null));
            prisma.fichaEtapa.update.mockResolvedValue({ id: 1 });

            await expect(
                service.updateFichaEtapa(
                    1,
                    {
                        data_inicio: "2026-08-20T10:00:00.000Z",
                        data_fim: "2026-08-25T10:00:00.000Z",
                    },
                    gerenteFabrico30,
                ),
            ).resolves.toEqual({ id: 1 });
            expect(prisma.fichaEtapa.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    observacoes: undefined,
                    data_inicio: "2026-08-20T10:00:00.000Z",
                    data_fim: "2026-08-25T10:00:00.000Z",
                },
            });
        });

        it("aceita data_inicio igual à data_fim", async () => {
            prisma.fichaEtapa.findFirst.mockResolvedValue(registro(null, null));
            prisma.fichaEtapa.update.mockResolvedValue({ id: 1 });

            await expect(
                service.updateFichaEtapa(
                    1,
                    {
                        data_inicio: "2026-08-20T10:00:00.000Z",
                        data_fim: "2026-08-20T10:00:00.000Z",
                    },
                    gerenteFabrico30,
                ),
            ).resolves.toEqual({ id: 1 });
        });

        it("não deixa um usuário de outra fábrica alterar as datas", async () => {
            prisma.fichaEtapa.findFirst.mockResolvedValue(null);

            await expect(
                service.updateFichaEtapa(
                    1,
                    { data_fim: "2026-08-25T10:00:00.000Z" },
                    gerenteFabrico30,
                ),
            ).rejects.toThrow(new NotFoundException("FichaEtapa não encontrada"));
            expect(prisma.fichaEtapa.update).not.toHaveBeenCalled();
        });
    });

    it("rejeita update de vínculo inexistente", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue(null);
        await expect(service.updateFichaEtapa(1, {} as any, gerenteFabrico30)).rejects.toThrow(
            new NotFoundException("FichaEtapa não encontrada"),
        );
    });

    it("traduz conflito Prisma ao atualizar vínculo", async () => {
        prisma.fichaEtapa.findFirst.mockResolvedValue({
            id: 1,
            ficha_tecnica_id: 10,
            etapa_id: 20,
            ficha_tecnica: { fabrico_id: 30 },
        });
        prisma.fichaEtapa.update.mockRejectedValue(
            new PrismaClientKnownRequestError("duplicado", {
                code: "P2002",
                clientVersion: "7.0.0",
            }),
        );

        await expect(
            service.updateFichaEtapa(1, { observacoes: "x" } as any, gerenteFabrico30),
        ).rejects.toThrow(new ConflictException("Ficha Etapa já cadastrada"));
    });
});
