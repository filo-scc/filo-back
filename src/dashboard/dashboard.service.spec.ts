import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "src/prisma/prisma.service";
import { DashboardService } from "./dashboard.service";
import { ProductionSeriesPeriod } from "./dto/production-series-query.dto";

describe("DashboardService", () => {
    let service: DashboardService;

    const prisma = {
        fabrico: { findUnique: jest.fn() },
        pedido: { findMany: jest.fn() },
        fichaTecnica: { findMany: jest.fn() },
    };

    const now = new Date("2026-08-25T15:00:00.000Z");

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
        }).compile();

        service = module.get(DashboardService);
        jest.clearAllMocks();
        prisma.fabrico.findUnique.mockResolvedValue({
            id: 7,
            fabricacao_sob_demanda: true,
        });
        prisma.pedido.findMany.mockResolvedValue([]);
        prisma.fichaTecnica.findMany.mockResolvedValue([]);
    });

    it("rejeita usuário sem fábrica associada", async () => {
        await expect(service.getOperationalSummary(null, now)).rejects.toThrow(ForbiddenException);
        expect(prisma.fabrico.findUnique).not.toHaveBeenCalled();
    });

    it("calcula o resumo por pedido e considera a última etapa operacionalmente concluída", async () => {
        prisma.pedido.findMany.mockResolvedValue([
            {
                id: 1,
                data_prevista: new Date("2026-08-24T12:00:00.000Z"),
                fichas_tecnicas: [{ concluida: false, produzida_em: null }],
            },
            {
                id: 2,
                data_prevista: new Date("2026-08-20T12:00:00.000Z"),
                fichas_tecnicas: [
                    { concluida: false, produzida_em: new Date("2026-08-20T10:00:00.000Z") },
                ],
            },
            {
                id: 3,
                data_prevista: null,
                fichas_tecnicas: [{ concluida: true, produzida_em: null }],
            },
            {
                id: 4,
                data_prevista: new Date("2026-08-01T12:00:00.000Z"),
                fichas_tecnicas: [],
            },
            {
                id: 5,
                data_prevista: new Date("2026-08-30T12:00:00.000Z"),
                fichas_tecnicas: [
                    { concluida: false, produzida_em: new Date("2026-08-22T10:00:00.000Z") },
                    { concluida: false, produzida_em: null },
                ],
            },
        ]);
        prisma.fichaTecnica.findMany.mockResolvedValue([{ quantidade: 100 }, { quantidade: 102 }]);

        const result = await service.getOperationalSummary(7, now);

        expect(result.weeklyAverageProducedPieces).toBe(51);
        expect(result.inProgressCount).toBe(2);
        expect(result.overdueCount).toBe(1);
        expect(result.terminology.inProgressLabel).toBe("Pedidos em andamento");
        expect(result.generatedAt).toBe(now.toISOString());
        expect(result.period).toEqual({
            startAt: "2026-08-03T03:00:00.000Z",
            endAt: "2026-08-31T03:00:00.000Z",
            calendarWeeks: 4,
        });
        expect(prisma.pedido.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { fabrico_id: 7 } }),
        );
        expect(prisma.fichaTecnica.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    fabrico_id: 7,
                    produzida_em: {
                        gte: new Date("2026-08-03T03:00:00.000Z"),
                        lt: new Date("2026-08-31T03:00:00.000Z"),
                    },
                },
            }),
        );
    });

    it("altera a terminologia para produção própria", async () => {
        prisma.fabrico.findUnique.mockResolvedValue({
            id: 7,
            fabricacao_sob_demanda: false,
        });

        const result = await service.getOperationalSummary(7, now);

        expect(result.manufacturingMode).toBe("OWN_PRODUCTION");
        expect(result.terminology).toEqual({
            entitySingular: "Produção",
            entityPlural: "Produções",
            inProgressLabel: "Produções em andamento",
            overdueLabel: "Produções em atraso",
        });
    });

    it("retorna zeros, sem erro, para fábrica sem dados", async () => {
        const result = await service.getOperationalSummary(7, now);

        expect(result).toEqual(
            expect.objectContaining({
                weeklyAverageProducedPieces: 0,
                inProgressCount: 0,
                overdueCount: 0,
                hasData: false,
            }),
        );
    });

    it("monta sete semanas e separa produção, perdas e produção aproveitada", async () => {
        prisma.fichaTecnica.findMany.mockResolvedValue([
            {
                quantidade: 100,
                defeitos_costura: 3,
                defeitos_tecido: 4,
                retiradas: 5,
                sobras: 3,
                produzida_em: new Date("2026-08-25T10:00:00.000Z"),
            },
            {
                quantidade: 40,
                defeitos_costura: null,
                defeitos_tecido: null,
                retiradas: null,
                sobras: null,
                produzida_em: new Date("2026-08-18T10:00:00.000Z"),
            },
        ]);

        const result = await service.getProductionSeries(7, ProductionSeriesPeriod.WEEKLY, 7, now);

        expect(result.data).toHaveLength(7);
        expect(result.range).toEqual({
            startAt: "2026-07-13T03:00:00.000Z",
            endAt: "2026-08-31T03:00:00.000Z",
        });
        expect(result.data[5]).toEqual(
            expect.objectContaining({ production: 40, losses: 0, netProduction: 40 }),
        );
        expect(result.data[6]).toEqual(
            expect.objectContaining({ production: 100, losses: 15, netProduction: 85 }),
        );
        expect(result.hasData).toBe(true);
        expect(prisma.fichaTecnica.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    fabrico_id: 7,
                    produzida_em: {
                        gte: new Date("2026-07-13T03:00:00.000Z"),
                        lt: new Date("2026-08-31T03:00:00.000Z"),
                    },
                },
                select: expect.objectContaining({ produzida_em: true }),
            }),
        );
    });

    it("respeita a virada do dia e da semana no fuso America/Recife", async () => {
        prisma.fichaTecnica.findMany.mockResolvedValue([
            {
                quantidade: 10,
                defeitos_costura: 0,
                defeitos_tecido: 0,
                retiradas: 0,
                sobras: 0,
                produzida_em: new Date("2026-08-24T02:59:59.000Z"),
            },
            {
                quantidade: 20,
                defeitos_costura: 0,
                defeitos_tecido: 0,
                retiradas: 0,
                sobras: 0,
                produzida_em: new Date("2026-08-24T03:00:00.000Z"),
            },
        ]);

        const result = await service.getProductionSeries(7, ProductionSeriesPeriod.WEEKLY, 7, now);

        expect(result.data[5].production).toBe(10);
        expect(result.data[6].production).toBe(20);
    });

    it("respeita as viradas de mês e ano", async () => {
        const januaryNow = new Date("2027-01-02T15:00:00.000Z");
        prisma.fichaTecnica.findMany.mockResolvedValue([
            {
                quantidade: 12,
                defeitos_costura: 0,
                defeitos_tecido: 0,
                retiradas: 0,
                sobras: 0,
                produzida_em: new Date("2027-01-01T02:59:59.000Z"),
            },
            {
                quantidade: 18,
                defeitos_costura: 0,
                defeitos_tecido: 0,
                retiradas: 0,
                sobras: 0,
                produzida_em: new Date("2027-01-01T03:00:00.000Z"),
            },
        ]);

        const monthly = await service.getProductionSeries(
            7,
            ProductionSeriesPeriod.MONTHLY,
            7,
            januaryNow,
        );
        const yearly = await service.getProductionSeries(
            7,
            ProductionSeriesPeriod.YEARLY,
            7,
            januaryNow,
        );

        expect(monthly.data[5]).toEqual(
            expect.objectContaining({ label: "Dez 2026", production: 12 }),
        );
        expect(monthly.data[6]).toEqual(
            expect.objectContaining({ label: "Jan 2027", production: 18 }),
        );
        expect(yearly.data[5]).toEqual(expect.objectContaining({ label: "2026", production: 12 }));
        expect(yearly.data[6]).toEqual(expect.objectContaining({ label: "2027", production: 18 }));
    });

    it("retorna a quantidade solicitada de intervalos zerados quando não há produção", async () => {
        const result = await service.getProductionSeries(
            7,
            ProductionSeriesPeriod.QUARTERLY,
            5,
            now,
        );

        expect(result.hasData).toBe(false);
        expect(result.data).toHaveLength(5);
        expect(result.data.every((item) => item.production === 0 && item.losses === 0)).toBe(true);
    });
});
