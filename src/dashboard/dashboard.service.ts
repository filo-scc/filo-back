import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { ProductionSeriesPeriod } from "./dto/production-series-query.dto";

const OFFICIAL_TIMEZONE = "America/Recife";
const MONTH_NAMES = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
];

type CalendarDate = {
    year: number;
    month: number;
    day: number;
};

type CalendarInterval = {
    key: string;
    label: string;
    startAt: Date;
    endAt: Date;
};

const zonedDateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICIAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

function getZonedParts(date: Date) {
    const values = Object.fromEntries(
        zonedDateFormatter
            .formatToParts(date)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, Number(part.value)]),
    );

    return {
        year: values.year,
        month: values.month,
        day: values.day,
        hour: values.hour === 24 ? 0 : values.hour,
        minute: values.minute,
        second: values.second,
    };
}

function zonedStartOfDay(date: CalendarDate): Date {
    const targetTimestamp = Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0);
    let utcTimestamp = targetTimestamp;

    // Resolve o offset do IANA timezone sem assumir que ele será sempre UTC-03:00.
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const represented = getZonedParts(new Date(utcTimestamp));
        const representedTimestamp = Date.UTC(
            represented.year,
            represented.month - 1,
            represented.day,
            represented.hour,
            represented.minute,
            represented.second,
        );
        utcTimestamp += targetTimestamp - representedTimestamp;
    }

    return new Date(utcTimestamp);
}

function shiftCalendarDate(
    date: CalendarDate,
    options: { days?: number; months?: number; years?: number },
) {
    const shifted = new Date(
        Date.UTC(
            date.year + (options.years ?? 0),
            date.month - 1 + (options.months ?? 0),
            date.day + (options.days ?? 0),
        ),
    );

    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
    };
}

function startOfWeek(date: CalendarDate): CalendarDate {
    const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
    const daysSinceMonday = (weekday + 6) % 7;
    return shiftCalendarDate(date, { days: -daysSinceMonday });
}

function calendarDateValue(date: CalendarDate) {
    return date.year * 10_000 + date.month * 100 + date.day;
}

function getUtcCalendarDate(date: Date): CalendarDate {
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
    };
}

function formatWeekLabel(start: CalendarDate, endExclusive: CalendarDate) {
    const end = shiftCalendarDate(endExclusive, { days: -1 });
    const startDay = String(start.day).padStart(2, "0");
    const endDay = String(end.day).padStart(2, "0");

    if (start.month === end.month && start.year === end.year) {
        return `${startDay}–${endDay} ${MONTH_NAMES[start.month - 1]}`;
    }

    if (start.year === end.year) {
        return `${startDay} ${MONTH_NAMES[start.month - 1]}–${endDay} ${MONTH_NAMES[end.month - 1]}`;
    }

    return `${startDay} ${MONTH_NAMES[start.month - 1]} ${String(start.year).slice(-2)}–${endDay} ${MONTH_NAMES[end.month - 1]} ${String(end.year).slice(-2)}`;
}

function buildIntervals(
    period: ProductionSeriesPeriod,
    intervalCount: number,
    now: Date,
): CalendarInterval[] {
    const nowParts = getZonedParts(now);
    const today = { year: nowParts.year, month: nowParts.month, day: nowParts.day };
    const intervals: CalendarInterval[] = [];

    for (let offset = intervalCount - 1; offset >= 0; offset -= 1) {
        let start: CalendarDate;
        let end: CalendarDate;
        let key: string;
        let label: string;

        if (period === ProductionSeriesPeriod.WEEKLY) {
            start = shiftCalendarDate(startOfWeek(today), { days: -offset * 7 });
            end = shiftCalendarDate(start, { days: 7 });
            key = `week-${start.year}-${String(start.month).padStart(2, "0")}-${String(start.day).padStart(2, "0")}`;
            label = formatWeekLabel(start, end);
        } else if (period === ProductionSeriesPeriod.MONTHLY) {
            start = shiftCalendarDate(
                { year: today.year, month: today.month, day: 1 },
                { months: -offset },
            );
            end = shiftCalendarDate(start, { months: 1 });
            key = `month-${start.year}-${String(start.month).padStart(2, "0")}`;
            label = `${MONTH_NAMES[start.month - 1]} ${start.year}`;
        } else if (period === ProductionSeriesPeriod.QUARTERLY) {
            const currentQuarterMonth = Math.floor((today.month - 1) / 3) * 3 + 1;
            start = shiftCalendarDate(
                { year: today.year, month: currentQuarterMonth, day: 1 },
                { months: -offset * 3 },
            );
            end = shiftCalendarDate(start, { months: 3 });
            const quarter = Math.floor((start.month - 1) / 3) + 1;
            key = `quarter-${start.year}-${quarter}`;
            label = `${quarter}º tri ${start.year}`;
        } else {
            start = { year: today.year - offset, month: 1, day: 1 };
            end = { year: start.year + 1, month: 1, day: 1 };
            key = `year-${start.year}`;
            label = String(start.year);
        }

        intervals.push({
            key,
            label,
            startAt: zonedStartOfDay(start),
            endAt: zonedStartOfDay(end),
        });
    }

    return intervals;
}

function getLosses(ficha: {
    defeitos_costura: number | null;
    defeitos_tecido: number | null;
    retiradas: number | null;
    sobras: number | null;
}) {
    return (
        Number(ficha.defeitos_costura ?? 0) +
        Number(ficha.defeitos_tecido ?? 0) +
        Number(ficha.retiradas ?? 0) +
        Number(ficha.sobras ?? 0)
    );
}

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) {}

    private async getDashboardContext(fabricoId?: number | null) {
        if (!fabricoId) {
            throw new ForbiddenException("Usuário não possui um fabrico associado");
        }

        const fabrico = await this.prisma.fabrico.findUnique({
            where: { id: fabricoId },
            select: { id: true, fabricacao_sob_demanda: true },
        });

        if (!fabrico) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return fabrico;
    }

    async getOperationalSummary(fabricoId?: number | null, now = new Date()) {
        const fabrico = await this.getDashboardContext(fabricoId);
        const nowParts = getZonedParts(now);
        const today = { year: nowParts.year, month: nowParts.month, day: nowParts.day };
        const currentWeekStart = startOfWeek(today);
        const summaryStart = shiftCalendarDate(currentWeekStart, { days: -21 });
        const summaryEnd = shiftCalendarDate(currentWeekStart, { days: 7 });
        const todayValue = calendarDateValue(today);
        const periodStartAt = zonedStartOfDay(summaryStart);
        const periodEndAt = zonedStartOfDay(summaryEnd);

        const [pedidos, fichasProduzidas] = await Promise.all([
            this.prisma.pedido.findMany({
                where: { fabrico_id: fabrico.id },
                select: {
                    id: true,
                    data_prevista: true,
                    fichas_tecnicas: {
                        select: { concluida: true, produzida_em: true },
                    },
                },
            }),
            this.prisma.fichaTecnica.findMany({
                where: {
                    fabrico_id: fabrico.id,
                    produzida_em: { gte: periodStartAt, lt: periodEndAt },
                },
                select: { quantidade: true },
            }),
        ]);

        const pedidosComFicha = pedidos.filter((pedido) => pedido.fichas_tecnicas.length > 0);
        const pedidosEmAndamento = pedidosComFicha.filter((pedido) =>
            pedido.fichas_tecnicas.some((ficha) => !ficha.concluida && !ficha.produzida_em),
        );
        const pedidosEmAtraso = pedidosEmAndamento.filter(
            (pedido) =>
                pedido.data_prevista &&
                calendarDateValue(getUtcCalendarDate(pedido.data_prevista)) < todayValue,
        );
        const totalProduzido = fichasProduzidas.reduce(
            (total, ficha) => total + Number(ficha.quantidade ?? 0),
            0,
        );
        const sobDemanda = fabrico.fabricacao_sob_demanda;
        const entitySingular = sobDemanda ? "Pedido" : "Produção";
        const entityPlural = sobDemanda ? "Pedidos" : "Produções";

        return {
            weeklyAverageProducedPieces: Math.floor(totalProduzido / 4 + 0.5),
            inProgressCount: pedidosEmAndamento.length,
            overdueCount: pedidosEmAtraso.length,
            period: {
                startAt: periodStartAt.toISOString(),
                endAt: periodEndAt.toISOString(),
                calendarWeeks: 4,
            },
            generatedAt: now.toISOString(),
            timezone: OFFICIAL_TIMEZONE,
            hasData: pedidosComFicha.length > 0 || fichasProduzidas.length > 0,
            manufacturingMode: sobDemanda ? "ON_DEMAND" : "OWN_PRODUCTION",
            terminology: {
                entitySingular,
                entityPlural,
                inProgressLabel: `${entityPlural} em andamento`,
                overdueLabel: `${entityPlural} em atraso`,
            },
        };
    }

    async getProductionSeries(
        fabricoId?: number | null,
        period = ProductionSeriesPeriod.WEEKLY,
        intervalCount = 7,
        now = new Date(),
    ) {
        const fabrico = await this.getDashboardContext(fabricoId);
        const normalizedIntervalCount = Math.min(24, Math.max(1, Math.trunc(intervalCount)));
        const intervals = buildIntervals(period, normalizedIntervalCount, now);
        const firstInterval = intervals[0];
        const lastInterval = intervals[intervals.length - 1];

        const fichas = await this.prisma.fichaTecnica.findMany({
            where: {
                fabrico_id: fabrico.id,
                produzida_em: { gte: firstInterval.startAt, lt: lastInterval.endAt },
            },
            select: {
                quantidade: true,
                defeitos_costura: true,
                defeitos_tecido: true,
                retiradas: true,
                sobras: true,
                produzida_em: true,
            },
        });

        const data = intervals.map((interval) => {
            const fichasDoIntervalo = fichas.filter((ficha) => {
                const producedAt = ficha.produzida_em;
                return producedAt && producedAt >= interval.startAt && producedAt < interval.endAt;
            });
            const production = fichasDoIntervalo.reduce(
                (total, ficha) => total + Number(ficha.quantidade ?? 0),
                0,
            );
            const losses = fichasDoIntervalo.reduce((total, ficha) => total + getLosses(ficha), 0);

            return {
                key: interval.key,
                label: interval.label,
                startAt: interval.startAt.toISOString(),
                endAt: interval.endAt.toISOString(),
                production,
                losses,
                netProduction: production - losses,
            };
        });

        return {
            period,
            timezone: OFFICIAL_TIMEZONE,
            range: {
                startAt: firstInterval.startAt.toISOString(),
                endAt: lastInterval.endAt.toISOString(),
            },
            generatedAt: now.toISOString(),
            hasData: fichas.length > 0,
            data,
        };
    }
}
