import { Module } from '@nestjs/common';
import { FaccaoService } from './faccao.service';
import { FaccaoController } from './faccao.controller';

@Module({
  controllers: [FaccaoController],
  providers: [FaccaoService],
})
export class FaccaoModule {}
