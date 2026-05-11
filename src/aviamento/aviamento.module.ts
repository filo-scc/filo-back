import { Module } from "@nestjs/common";
import { AviamentoController } from "./aviamento.controller";
import { AviamentoService } from "./aviamento.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
    controllers: [AviamentoController],
    providers: [
        AviamentoService,
        PrismaService,
    ],
})
export class AviamentoModule {}