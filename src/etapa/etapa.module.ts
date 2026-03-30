import { Module } from '@nestjs/common';
import { EtapaService } from './etapa.service';
import { EtapaController } from './etapa.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IconeModule } from './icone.module';

@Module({
  imports: [PrismaModule, IconeModule],
  controllers: [EtapaController],
  providers: [EtapaService],
})
export class EtapaModule {}
