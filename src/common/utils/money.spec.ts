import { Prisma } from "@prisma/client";
import { lineTotal, moneyOrZero, sumMoney, toMoney, toMoneyOrNull } from "./money";

describe("money", () => {
    it("arredonda 1.005 para 1.01 com ROUND_HALF_UP", () => {
        expect(toMoney("1.005").toString()).toBe("1.01");
        expect(toMoney(1.005).equals(new Prisma.Decimal("1.01"))).toBe(true);
    });

    it("arredonda para baixo valores abaixo do meio", () => {
        expect(toMoney("1.004").toString()).toBe("1");
    });

    it("normaliza null e undefined para nulo ou zero", () => {
        expect(toMoneyOrNull(null)).toBeNull();
        expect(toMoneyOrNull(undefined)).toBeNull();
        expect(moneyOrZero(null).toString()).toBe("0");
        expect(moneyOrZero(undefined).toString()).toBe("0");
    });

    it("normaliza o preço unitário antes de multiplicar a quantidade", () => {
        // 1.005 vira 1.01 no banco; 3 * 1.01 = 3.03, não 3.015 → 3.02
        expect(lineTotal(3, "1.005").toString()).toBe("3.03");
        expect(lineTotal(1, "1.005").toString()).toBe("1.01");
    });

    it("soma linhas já normalizadas na mesma escala", () => {
        expect(sumMoney([lineTotal(1, "1.005"), lineTotal(2, "1.005")]).toString()).toBe("3.03");
    });
});
