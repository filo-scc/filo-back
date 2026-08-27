import { Module } from "@nestjs/common";
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService } from './notificacoes.service';
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [NotificacoesController],
  providers: [NotificacoesService]
})
export class NotificacoesModule {}
