import { Prisma } from "@prisma/client";

/**
 * Trava as linhas dos pedidos (FOR UPDATE) em ordem crescente de id.
 * Todos os fluxos que alteram fichas de um pedido travam o pedido primeiro;
 * manter a mesma ordem evita deadlock e contagens obsoletas.
 */
export async function lockPedidos(tx: Prisma.TransactionClient, pedidoIds: number[]) {
    const ids = [...new Set(pedidoIds)].sort((a, b) => a - b);

    for (const id of ids) {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM "pedidos" WHERE id = ${id} FOR UPDATE`);
    }
}

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

    // Trava antes de contar: sem isso, uma ficha pendente inserida por outra
    // transação ainda não confirmada fica invisível e o pedido é finalizado indevidamente.
    await lockPedidos(tx, [pedidoId]);

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
