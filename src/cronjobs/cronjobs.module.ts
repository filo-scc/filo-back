import { Module } from '@nestjs/common';
import { ConcluirFichasCronService } from './concluir-fichas-cron';
import { PrismaModule } from '../prisma/prisma.module'; // Ajuste o caminho correto para o seu PrismaModule

@Module({
  imports: [PrismaModule],
  providers: [ConcluirFichasCronService],
})
export class CronjobsModule {}