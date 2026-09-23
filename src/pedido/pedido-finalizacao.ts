import { Prisma } from "@prisma/client";

/**
 * Mantém pedido.finalizado alinhado às fichas técnicas:
 * - com ≥1 ficha e nenhuma pendente → finalizado = true
 * - com alguma ficha pendente → finalizado = false
 * Pedidos sem fichas não são alterados.
 */
export async function sincronizarFinalizacaoPedido(
    tx: Prisma.TransactionClient,
    pedidoId: number | null | undefined,
) {
    if (!pedidoId) {
        return;
    }

    const totalFichas = await tx.fichaTecnica.count({
        where: { pedido_id: pedidoId },
    });

    if (totalFichas === 0) {
        return;
    }

    const pendentes = await tx.fichaTecnica.count({
        where: { pedido_id: pedidoId, concluida: false },
    });

    if (pendentes === 0) {
        await tx.pedido.updateMany({
            where: { id: pedidoId, finalizado: false },
            data: { finalizado: true },
        });
        return;
    }

    await tx.pedido.updateMany({
        where: { id: pedidoId, finalizado: true },
        data: { finalizado: false },
    });
}
