import { ConcluirFichasCronService } from "./concluir-fichas-cron";

describe("ConcluirFichasCronService", () => {
    const prisma = {
        fabrico: { findMany: jest.fn() },
        etapa: { findFirst: jest.fn() },
        fichaEtapa: { findMany: jest.fn(), updateMany: jest.fn() },
        fichaTecnica: { updateMany: jest.fn() },
        $transaction: jest.fn(),
    };

    let service: ConcluirFichasCronService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ConcluirFichasCronService(prisma as any);
        prisma.fabrico.findMany.mockResolvedValue([]);
    });

    it("executa a verificação imediatamente ao inicializar o módulo", async () => {
        await service.onModuleInit();

        expect(prisma.fabrico.findMany).toHaveBeenCalledTimes(1);
    });

    it("conclui fichas elegíveis durante a execução agendada", async () => {
        prisma.fabrico.findMany.mockResolvedValue([{ id: 10 }]);
        prisma.etapa.findFirst.mockResolvedValue({ id: 30 });
        prisma.fichaEtapa.findMany.mockResolvedValue([
            { id: 40, ficha_tecnica_id: 50 },
            { id: 41, ficha_tecnica_id: 51 },
        ]);
        prisma.$transaction.mockResolvedValue([]);

        await service.handleConcluirFichasAntigas();

        expect(prisma.fichaEtapa.findMany).toHaveBeenCalledWith({
            where: {
                etapa_id: 30,
                data_inicio: { lte: expect.any(Date) },
                data_fim: null,
                ficha_tecnica: {
                    concluida: false,
                    fabrico_id: 10,
                    etapa_atual_id: 30,
                },
            },
            select: {
                id: true,
                ficha_tecnica_id: true,
            },
        });
        expect(prisma.fichaTecnica.updateMany).toHaveBeenCalledWith({
            where: { id: { in: [50, 51] } },
            data: { concluida: true },
        });
        expect(prisma.fichaEtapa.updateMany).toHaveBeenCalledWith({
            where: { id: { in: [40, 41] } },
            data: { data_fim: expect.any(Date) },
        });
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("não inicia outra verificação enquanto uma execução está em andamento", async () => {
        let liberarConsulta: (() => void) | undefined;
        prisma.fabrico.findMany.mockImplementation(
            () =>
                new Promise((resolve) => {
                    liberarConsulta = () => resolve([]);
                }),
        );

        const primeiraExecucao = service.handleConcluirFichasAntigas();
        await Promise.resolve();
        await service.handleConcluirFichasAntigas();

        expect(prisma.fabrico.findMany).toHaveBeenCalledTimes(1);

        liberarConsulta?.();
        await primeiraExecucao;
    });
});
