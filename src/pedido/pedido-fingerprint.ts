import { createHash } from "node:crypto";
import type { CreatePedidoCompletoDto } from "./dto/create-pedido-completo.dto";

function canonicalizar(valor: unknown): unknown {
    if (Array.isArray(valor)) return valor.map(canonicalizar);
    if (valor !== null && typeof valor === "object") {
        return Object.fromEntries(
            Object.entries(valor)
                .filter(([, item]) => item !== undefined)
                .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
                .map(([chave, item]) => [chave, canonicalizar(item)]),
        );
    }
    return valor;
}

export function fingerprintPedido(data: CreatePedidoCompletoDto): string {
    // A chave é transporte (header ou body); arrays preservam a ordem enviada.
    const payload = Object.fromEntries(
        Object.entries(data).filter(([chave]) => chave !== "idempotency_key"),
    );
    return createHash("sha256")
        .update(JSON.stringify(canonicalizar(payload)))
        .digest("hex");
}
