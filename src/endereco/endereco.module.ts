import { Module } from '@nestjs/common';
import { EnderecoService } from './endereco.service';
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [EnderecoService],
  exports: [EnderecoService]
})
export class EnderecoModule {}