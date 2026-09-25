import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { lockPedidos, sincronizarFinalizacaoPedido } from "../pedido/pedido-finalizacao";

@Injectable()
export class ConcluirFichasCronService implements OnModuleInit {
    private readonly logger = new Logger(ConcluirFichasCronService.name);
    private executando = false;

    constructor(private readonly prisma: PrismaService) {}

    async onModuleInit() {
        await this.executarConclusaoDeFichas("inicialização do backend");
    }

    @Cron(CronExpression.EVERY_8_HOURS)
    async handleConcluirFichasAntigas() {
        await this.executarConclusaoDeFichas("agendamento de 8 horas");
    }

    private async executarConclusaoDeFichas(origem: string) {
        if (this.executando) {
            this.logger.warn(
                `Job de conclusão de fichas ignorado (${origem}): já existe uma execução em andamento.`,
            );
            return;
        }

        this.executando = true;
        const inicio = Date.now();

        this.logger.log(`Iniciando Job de conclusão de fichas (${origem})...`);

        try {
            const setentaEDuasHorasAtras = new Date();
            setentaEDuasHorasAtras.setHours(setentaEDuasHorasAtras.getHours() - 72);

            const agora = new Date();
            const fichasParaConcluir = await this.prisma.fichaTecnica.findMany({
                where: {
                    concluida: false,
                    produzida_em: { lte: setentaEDuasHorasAtras },
                    fabrico: { ativo: true },
                },
                select: { id: true, pedido_id: true },
            });
            const idsFichas = fichasParaConcluir.map((ficha) => ficha.id);
            const pedidoIds = [
                ...new Set(
                    fichasParaConcluir
                        .map((ficha) => ficha.pedido_id)
                        .filter((pedidoId): pedidoId is number => pedidoId != null),
                ),
            ];

            if (idsFichas.length > 0) {
                await this.prisma.$transaction(async (tx) => {
                    // Mesma ordem do updateCompleto: pedido antes das fichas.
                    await lockPedidos(tx, pedidoIds);

                    await tx.fichaTecnica.updateMany({
                        where: { id: { in: idsFichas }, concluida: false },
                        data: { concluida: true },
                    });
                    await tx.fichaEtapa.updateMany({
                        where: {
                            ficha_tecnica_id: { in: idsFichas },
                            data_fim: null,
                        },
                        data: { data_fim: agora },
                    });

                    for (const pedidoId of pedidoIds) {
                        await sincronizarFinalizacaoPedido(tx, pedidoId);
                    }
                });
            }

            this.logger.log(
                `Job finalizado com sucesso (${origem}). Total de ${idsFichas.length} fichas técnicas concluídas em ${Date.now() - inicio}ms.`,
            );
        } catch (error) {
            const detalhe = error instanceof Error ? error.stack : String(error);
            this.logger.error(
                `Erro ao executar o Job de conclusão de fichas técnicas (${origem}).`,
                detalhe,
            );
        } finally {
            this.executando = false;
        }
    }
}
