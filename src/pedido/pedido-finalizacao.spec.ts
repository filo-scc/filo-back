import { sincronizarFinalizacaoPedido } from "./pedido-finalizacao";

describe("sincronizarFinalizacaoPedido", () => {
    const tx = {
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
});
