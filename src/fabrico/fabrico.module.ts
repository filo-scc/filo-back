import { Module } from '@nestjs/common';
import { FabricoService } from './fabrico.service';
import { FabricoController } from './fabrico.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FabricoController],
  providers: [FabricoService],
})
export class FabricoModule {}
