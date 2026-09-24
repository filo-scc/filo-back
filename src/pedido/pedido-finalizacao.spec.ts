import { lockPedidos, sincronizarFinalizacaoPedido } from "./pedido-finalizacao";

describe("sincronizarFinalizacaoPedido", () => {
    const tx = {
        $queryRaw: jest.fn(),
        fichaTecnica: { count: jest.fn() },
        pedido: { updateMany: jest.fn() },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("não faz nada sem pedidoId", async () => {
        await sincronizarFinalizacaoPedido(tx as any, null);
        await sincronizarFinalizacaoPedido(tx as any, undefined);

        expect(tx.fichaTecnica.count).not.toHaveBeenCalled();
        expect(tx.$queryRaw).not.toHaveBeenCalled();
    });

    it("trava o pedido antes de contar as fichas", async () => {
        tx.fichaTecnica.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
        tx.pedido.updateMany.mockResolvedValue({ count: 1 });

        await sincronizarFinalizacaoPedido(tx as any, 10);

        expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
        expect(tx.$queryRaw.mock.calls[0][0].values).toEqual([10]);
        expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
            tx.fichaTecnica.count.mock.invocationCallOrder[0],
        );
    });

    it("não altera pedido sem fichas", async () => {
        tx.fichaTecnica.count.mockResolvedValueOnce(0);

        await sincronizarFinalizacaoPedido(tx as any, 10);

        expect(tx.pedido.updateMany).not.toHaveBeenCalled();
    });

    it("finaliza pedido quando não há fichas pendentes", async () => {
        tx.fichaTecnica.count.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
        tx.pedido.updateMany.mockResolvedValue({ count: 1 });

        await sincronizarFinalizacaoPedido(tx as any, 10);

        expect(tx.pedido.updateMany).toHaveBeenCalledWith({
            where: { id: 10, finalizado: false },
            data: { finalizado: true },
        });
    });

    it("reabre pedido quando ainda há fichas pendentes", async () => {
        tx.fichaTecnica.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
        tx.pedido.updateMany.mockResolvedValue({ count: 1 });

        await sincronizarFinalizacaoPedido(tx as any, 10);

        expect(tx.pedido.updateMany).toHaveBeenCalledWith({
            where: { id: 10, finalizado: true },
            data: { finalizado: false },
        });
    });

    describe("lockPedidos", () => {
        it("trava cada pedido uma vez, em ordem crescente de id", async () => {
            await lockPedidos(tx as any, [7, 2, 7, 5]);

            expect(tx.$queryRaw.mock.calls.map(([sql]) => sql.values)).toEqual([[2], [5], [7]]);
        });
    });
});
