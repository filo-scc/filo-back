import { Module } from '@nestjs/common';
import { EtapaService } from './etapa.service';
import { EtapaController } from './etapa.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EtapaController],
  providers: [EtapaService],
})
export class EtapaModule {}