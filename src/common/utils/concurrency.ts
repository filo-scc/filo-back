import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

const FABRICO_NUMERACAO_LOCK = 1;
const IDEMPOTENCY_KEY_MAX = 128;

export function normalizeIdempotencyKey(value?: string | null): string | null {
    const key = value?.trim() ?? "";

    if (!key) {
        return null;
    }

    // Truncar faria chaves distintas colidirem e devolverem o pedido de outra requisição.
    if (key.length > IDEMPOTENCY_KEY_MAX) {
        throw new BadRequestException(
            `A chave de idempotência deve ter no máximo ${IDEMPOTENCY_KEY_MAX} caracteres`,
        );
    }

    return key;
}

export function isIdempotencyConflict(error: Prisma.PrismaClientKnownRequestError): boolean {
    const target = error.meta?.target;
    const text = Array.isArray(target) ? target.join(",") : String(target ?? "");

    return text.includes("idempotency_key");
}

export async function lockFabricoNumeracao(
    tx: Prisma.TransactionClient,
    fabricoId: number,
): Promise<void> {
    await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(${FABRICO_NUMERACAO_LOCK}, ${fabricoId})`,
    );
}

export async function proximoNumeroPedido(
    tx: Prisma.TransactionClient,
    fabricoId: number,
): Promise<number> {
    const ultimoPedido = await tx.pedido.findFirst({
        where: { fabrico_id: fabricoId, numero: { not: null } },
        orderBy: { numero: "desc" },
        select: { numero: true },
    });

    return (ultimoPedido?.numero ?? 0) + 1;
}

export async function proximoNumeroFicha(
    tx: Prisma.TransactionClient,
    fabricoId: number,
): Promise<number> {
    const ultimaFicha = await tx.fichaTecnica.findFirst({
        where: { fabrico_id: fabricoId },
        orderBy: { numero: "desc" },
        select: { numero: true },
    });

    return (ultimaFicha?.numero ?? 0) + 1;
}
