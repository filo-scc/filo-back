import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service'; // Ajuste o caminho se necessário

@Injectable()
export class ConcluirFichasCronService {
  private readonly logger = new Logger(ConcluirFichasCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_8_HOURS) // Mude para EVERY_8_HOURS após testar!
  async handleConcluirFichasAntigas() {
    this.logger.log('Iniciando Job de verificação de fichas técnicas obsoletas...');

    try {
      const fabricos = await this.prisma.fabrico.findMany({
        where: { ativo: true },
        select: { id: true },
      });

      const setentaEDuasHorasAtras = new Date();
      setentaEDuasHorasAtras.setHours(setentaEDuasHorasAtras.getHours() - 72);

      const agora = new Date();
      let totalAtualizado = 0;

      for (const fabrico of fabricos) {
        const ultimaEtapa = await this.prisma.etapa.findFirst({
          where: { fabrico_id: fabrico.id, ativa: true },
          orderBy: { ordem: 'desc' },
          select: { id: true },
        });

        if (!ultimaEtapa) continue;

        const fichasParaConcluir = await this.prisma.fichaEtapa.findMany({
          where: {
            etapa_id: ultimaEtapa.id,
            data_inicio: { lte: setentaEDuasHorasAtras },
            data_fim: null,
            ficha_tecnica: {
              concluida: false,
              fabrico_id: fabrico.id,
              etapa_atual_id: ultimaEtapa.id,
            },
          },
          select: { 
            id: true, // Pega o id do vínculo da etapa
            ficha_tecnica_id: true 
          },
        });

        if (fichasParaConcluir.length === 0) continue;

        const idsFichasEtapas = fichasParaConcluir.map((f) => f.id);
        const idsFichas = fichasParaConcluir.map((f) => f.ficha_tecnica_id);

        // Atualiza ambas as tabelas de forma atômica e segura
        await this.prisma.$transaction([
          // 1. Conclui a Ficha Técnica
          this.prisma.fichaTecnica.updateMany({
            where: { id: { in: idsFichas } },
            data: { concluida: true },
          }),
          // 2. Atualiza a data_fim da última etapa dela
          this.prisma.fichaEtapa.updateMany({
            where: { id: { in: idsFichasEtapas } },
            data: { data_fim: agora },
          }),
        ]);

        totalAtualizado += idsFichas.length;
      }

      this.logger.log(`Job finalizado com sucesso. Total de ${totalAtualizado} fichas técnicas concluídas.`);
    } catch (error) {
      this.logger.error('Erro ao executar o Job de conclusão de fichas técnicas:', error);
    }
  }
}