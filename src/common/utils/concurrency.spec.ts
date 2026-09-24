import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
    isIdempotencyConflict,
    lockFabricoNumeracao,
    normalizeIdempotencyKey,
    proximoNumeroFicha,
    proximoNumeroPedido,
} from "./concurrency";

describe("concurrency", () => {
    it("normaliza chave de idempotência vazia para nulo", () => {
        expect(normalizeIdempotencyKey(undefined)).toBeNull();
        expect(normalizeIdempotencyKey("  ")).toBeNull();
        expect(normalizeIdempotencyKey("abc-1")).toBe("abc-1");
    });

    it("aceita chave de idempotência com exatamente 128 caracteres", () => {
        const chave = "a".repeat(128);

        expect(normalizeIdempotencyKey(chave)).toBe(chave);
    });

    it("rejeita chaves acima de 128 caracteres em vez de truncar", () => {
        const prefixo = "a".repeat(128);

        expect(() => normalizeIdempotencyKey(`${prefixo}1`)).toThrow(BadRequestException);
        expect(() => normalizeIdempotencyKey(`${prefixo}2`)).toThrow(BadRequestException);
    });

    it("reconhece conflito de idempotência pelo target do Prisma", () => {
        const error = Object.assign(new Error("unique"), {
            code: "P2002",
            meta: { target: ["fabrico_id", "idempotency_key"] },
            clientVersion: "0",
            name: "PrismaClientKnownRequestError",
        }) as Prisma.PrismaClientKnownRequestError;

        expect(isIdempotencyConflict(error)).toBe(true);
    });

    it("serializa numeração com advisory lock e max+1", async () => {
        const tx = {
            $executeRaw: jest.fn().mockResolvedValue(1),
            pedido: {
                findFirst: jest.fn().mockResolvedValue({ numero: 6 }),
            },
            fichaTecnica: {
                findFirst: jest.fn().mockResolvedValue({ numero: 4 }),
            },
        };

        await lockFabricoNumeracao(tx as never, 9);

        expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
        await expect(proximoNumeroPedido(tx as never, 9)).resolves.toBe(7);
        await expect(proximoNumeroFicha(tx as never, 9)).resolves.toBe(5);
    });
});
