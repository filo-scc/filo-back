import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
    assertFichaEditavel,
    assertMatrizSemMudanca,
    matrizEquivalente,
    mesmoPreco,
} from "./ficha";

describe("mesmoPreco", () => {
    it("trata null, undefined e string vazia como ausência", () => {
        expect(mesmoPreco(null, "")).toBe(true);
        expect(mesmoPreco(undefined, null)).toBe(true);
    });

    it("ausência contra valor é diferente", () => {
        expect(mesmoPreco(null, 0)).toBe(false);
        expect(mesmoPreco(10, null)).toBe(false);
    });

    it("compara string, number e Decimal pelo valor", () => {
        expect(mesmoPreco("270", 270)).toBe(true);
        expect(mesmoPreco(new Prisma.Decimal("270.00"), 270)).toBe(true);
        expect(mesmoPreco(1.005, 1.01)).toBe(false); // documenta: não arredonda
    });
});

describe("matrizEquivalente", () => {
    const a = [{ cor_id: 1, grade_versao_item_id: 11, quantidade: 5 }];

    it("célula ausente vale 0 nos dois lados", () => {
        const gravada = [...a, { cor_id: 1, grade_versao_item_id: 12, quantidade: 0 }];
        expect(matrizEquivalente(gravada, a)).toBe(true);
    });

    it("aceita ids como string", () => {
        expect(
            matrizEquivalente(a, [{ cor_id: "1", grade_versao_item_id: "11", quantidade: "5" }]),
        ).toBe(true);
    });

    it("conjunto de cores diferente é mudança", () => {
        expect(
            matrizEquivalente(a, [...a, { cor_id: 2, grade_versao_item_id: 11, quantidade: 0 }]),
        ).toBe(false);
    });

    it("cores_ids extra conta no conjunto de cores", () => {
        expect(matrizEquivalente(a, a, [1])).toBe(true);
        expect(matrizEquivalente(a, a, [2])).toBe(false);
    });

    it("quantidade diferente é mudança", () => {
        expect(matrizEquivalente(a, [{ ...a[0], quantidade: 6 }])).toBe(false);
    });
});

describe("assertFichaEditavel", () => {
    const base = {
        concluida: true,
        pedido_id: 1,
        quantidade: 10,
        observacoes: null,
        grade_versao_id: 3,
        defeitos_costura: 0,
        ficha_tecnica_itens: [],
        ficha_parceiro: [{ parceiro_id: 9, operacao: null }],
    };

    it("ficha não concluída nunca lança", () => {
        expect(() =>
            assertFichaEditavel({ ...base, concluida: false }, { quantidade: 99 }),
        ).not.toThrow();
    });

    it("campo omitido não conta como mudança", () => {
        expect(() => assertFichaEditavel(base, {})).not.toThrow();
    });

    it("observacoes null contra '' é eco", () => {
        expect(() => assertFichaEditavel(base, { observacoes: "" })).not.toThrow();
        expect(() => assertFichaEditavel(base, { observacoes: "x" })).toThrow(ConflictException);
    });

    it("grade_versao_id null/undefined é ignorado; diferente lança", () => {
        expect(() => assertFichaEditavel(base, { grade_versao_id: null })).not.toThrow();
        expect(() => assertFichaEditavel(base, { grade_versao_id: 4 })).toThrow(ConflictException);
    });

    it("campos de produção bloqueados", () => {
        expect(() => assertFichaEditavel(base, { defeitos_costura: 0 })).not.toThrow();
        expect(() => assertFichaEditavel(base, { defeitos_costura: 2 })).toThrow(ConflictException);
    });

    it("parceiro: quantidade, vínculo e operação", () => {
        expect(() =>
            assertFichaEditavel(base, { parceiros: [{ parceiro_id: 9, operacao: "" }] }),
        ).not.toThrow();
        expect(() => assertFichaEditavel(base, { parceiros: [] })).toThrow(ConflictException);
        expect(() => assertFichaEditavel(base, { parceiros: [{ parceiro_id: 8 }] })).toThrow(
            ConflictException,
        );
        expect(() =>
            assertFichaEditavel(base, { parceiros: [{ parceiro_id: 9, operacao: "Corte" }] }),
        ).toThrow(ConflictException);
    });

    it("sem contexto de preço, o preço não é comparado", () => {
        const p = { parceiros: [{ parceiro_id: 9, preco: 99 }], preco_padrao: 99 };
        expect(() => assertFichaEditavel(base, p)).not.toThrow();
    });

    it("com contexto, compara preço de parceiro e preço padrão", () => {
        const ctx = {
            precoParceiro: new Map([[9, new Prisma.Decimal("4")]]),
            precoPadraoCliente: new Prisma.Decimal("20"),
        };
        const eco = { parceiros: [{ parceiro_id: 9, preco: 4 }], preco_padrao: 20 };
        expect(() => assertFichaEditavel(base, eco, ctx)).not.toThrow();
        expect(() => assertFichaEditavel(base, { preco_padrao: 21 }, ctx)).toThrow(
            ConflictException,
        );
        expect(() =>
            assertFichaEditavel(base, { parceiros: [{ parceiro_id: 9, preco: 5 }] }, ctx),
        ).toThrow(ConflictException);
    });
});

describe("assertMatrizSemMudanca", () => {
    it("só lança se concluída e houve mudança", () => {
        expect(() => assertMatrizSemMudanca({ concluida: true }, false)).not.toThrow();
        expect(() => assertMatrizSemMudanca({ concluida: false }, true)).not.toThrow();
        expect(() => assertMatrizSemMudanca({ concluida: true }, true)).toThrow(ConflictException);
    });
});
