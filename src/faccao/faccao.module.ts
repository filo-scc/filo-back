import { Module } from '@nestjs/common';
import { FaccaoService } from './faccao.service';
import { FaccaoController } from './faccao.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FaccaoController],
  providers: [FaccaoService],
})
export class FaccaoModule {}
