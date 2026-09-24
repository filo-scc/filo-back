import { ConcluirFichasCronService } from "./concluir-fichas-cron";

describe("ConcluirFichasCronService", () => {
    const tx = {
        $queryRaw: jest.fn(),
        fichaEtapa: { updateMany: jest.fn() },
        fichaTecnica: { updateMany: jest.fn(), count: jest.fn() },
        pedido: { updateMany: jest.fn() },
    };

    const prisma = {
        fichaEtapa: { updateMany: jest.fn() },
        fichaTecnica: { findMany: jest.fn(), updateMany: jest.fn() },
        $transaction: jest.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
    };

    let service: ConcluirFichasCronService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ConcluirFichasCronService(prisma as any);
        prisma.fichaTecnica.findMany.mockResolvedValue([]);
        prisma.$transaction.mockImplementation(
            async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx),
        );
    });

    it("executa a verificação imediatamente ao inicializar o módulo", async () => {
        await service.onModuleInit();

        expect(prisma.fichaTecnica.findMany).toHaveBeenCalledTimes(1);
    });

    it("conclui fichas e finaliza pedidos sem pendências", async () => {
        prisma.fichaTecnica.findMany.mockResolvedValue([
            { id: 50, pedido_id: 1 },
            { id: 51, pedido_id: 1 },
            { id: 52, pedido_id: 2 },
        ]);
        tx.fichaTecnica.count
            .mockResolvedValueOnce(2) // pedido 1 total
            .mockResolvedValueOnce(0) // pedido 1 pendentes
            .mockResolvedValueOnce(2) // pedido 2 total
            .mockResolvedValueOnce(1); // pedido 2 ainda pendente
        tx.pedido.updateMany.mockResolvedValue({ count: 1 });

        await service.handleConcluirFichasAntigas();

        expect(prisma.fichaTecnica.findMany).toHaveBeenCalledWith({
            where: {
                concluida: false,
                produzida_em: { lte: expect.any(Date) },
                fabrico: { ativo: true },
            },
            select: { id: true, pedido_id: true },
        });
        expect(tx.fichaTecnica.updateMany).toHaveBeenCalledWith({
            where: { id: { in: [50, 51, 52] }, concluida: false },
            data: { concluida: true },
        });
        expect(tx.fichaEtapa.updateMany).toHaveBeenCalledWith({
            where: {
                ficha_tecnica_id: { in: [50, 51, 52] },
                data_fim: null,
            },
            data: { data_fim: expect.any(Date) },
        });
        expect(tx.pedido.updateMany).toHaveBeenCalledWith({
            where: { id: 1, finalizado: false },
            data: { finalizado: true },
        });
        expect(tx.pedido.updateMany).toHaveBeenCalledWith({
            where: { id: 2, finalizado: true },
            data: { finalizado: false },
        });
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("trava os pedidos em ordem crescente antes de concluir fichas e contar pendências", async () => {
        prisma.fichaTecnica.findMany.mockResolvedValue([
            { id: 60, pedido_id: 9 },
            { id: 61, pedido_id: 3 },
        ]);
        tx.fichaTecnica.count.mockResolvedValue(1);
        tx.pedido.updateMany.mockResolvedValue({ count: 0 });

        await service.handleConcluirFichasAntigas();

        const pedidosTravados = tx.$queryRaw.mock.calls.map(([sql]) => sql.values[0]);
        expect(pedidosTravados.slice(0, 2)).toEqual([3, 9]);

        const ultimaTravaInicial = tx.$queryRaw.mock.invocationCallOrder[1];
        expect(ultimaTravaInicial).toBeLessThan(
            tx.fichaTecnica.updateMany.mock.invocationCallOrder[0],
        );
        expect(ultimaTravaInicial).toBeLessThan(tx.fichaTecnica.count.mock.invocationCallOrder[0]);
    });

    it("não inicia outra verificação enquanto uma execução está em andamento", async () => {
        let liberarConsulta: (() => void) | undefined;
        prisma.fichaTecnica.findMany.mockImplementation(
            () =>
                new Promise((resolve) => {
                    liberarConsulta = () => resolve([]);
                }),
        );

        const primeiraExecucao = service.handleConcluirFichasAntigas();
        await Promise.resolve();
        await service.handleConcluirFichasAntigas();

        expect(prisma.fichaTecnica.findMany).toHaveBeenCalledTimes(1);

        liberarConsulta?.();
        await primeiraExecucao;
    });
});
