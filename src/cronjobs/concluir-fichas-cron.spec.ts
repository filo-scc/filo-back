import { ConcluirFichasCronService } from "./concluir-fichas-cron";

describe("ConcluirFichasCronService", () => {
    const prisma = {
        fichaEtapa: { updateMany: jest.fn() },
        fichaTecnica: { findMany: jest.fn(), updateMany: jest.fn() },
        $transaction: jest.fn(),
    };

    let service: ConcluirFichasCronService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ConcluirFichasCronService(prisma as any);
        prisma.fichaTecnica.findMany.mockResolvedValue([]);
    });

    it("executa a verificação imediatamente ao inicializar o módulo", async () => {
        await service.onModuleInit();

        expect(prisma.fichaTecnica.findMany).toHaveBeenCalledTimes(1);
    });

    it("conclui pelo evento de produção sem reinterpretar a última etapa atual", async () => {
        prisma.fichaTecnica.findMany.mockResolvedValue([{ id: 50 }, { id: 51 }]);
        prisma.$transaction.mockResolvedValue([]);

        await service.handleConcluirFichasAntigas();

        expect(prisma.fichaTecnica.findMany).toHaveBeenCalledWith({
            where: {
                concluida: false,
                produzida_em: { lte: expect.any(Date) },
                fabrico: { ativo: true },
            },
            select: { id: true },
        });
        expect(prisma.fichaTecnica.updateMany).toHaveBeenCalledWith({
            where: { id: { in: [50, 51] }, concluida: false },
            data: { concluida: true },
        });
        expect(prisma.fichaEtapa.updateMany).toHaveBeenCalledWith({
            where: {
                ficha_tecnica_id: { in: [50, 51] },
                data_fim: null,
            },
            data: { data_fim: expect.any(Date) },
        });
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
