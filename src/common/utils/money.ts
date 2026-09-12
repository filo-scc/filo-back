import { Prisma } from "@prisma/client";

const MONEY_SCALE = 2;
const MONEY_ROUNDING = Prisma.Decimal.ROUND_HALF_UP;

export type MoneyValue = Prisma.Decimal | number | string;

export function toMoney(value: MoneyValue): Prisma.Decimal {
    return new Prisma.Decimal(value).toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
}

export function toMoneyOrNull(value: MoneyValue | null | undefined): Prisma.Decimal | null {
    if (value === null || value === undefined) {
        return null;
    }

    return toMoney(value);
}

export function moneyOrZero(value: MoneyValue | null | undefined): Prisma.Decimal {
    return toMoney(value ?? 0);
}

export function lineTotal(
    quantity: MoneyValue,
    unitPrice: MoneyValue | null | undefined,
): Prisma.Decimal {
    return toMoney(new Prisma.Decimal(quantity).times(moneyOrZero(unitPrice)));
}

export function sumMoney(amounts: Iterable<Prisma.Decimal>): Prisma.Decimal {
    let total = new Prisma.Decimal(0);

    for (const amount of amounts) {
        total = total.plus(amount);
    }

    return toMoney(total);
}
