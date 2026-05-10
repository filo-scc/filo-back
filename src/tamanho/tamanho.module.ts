import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TamanhoController } from "./tamanho.controller";
import { TamanhoService } from "./tamanho.service";

@Module({
    imports: [PrismaModule],
    controllers: [TamanhoController],
    providers: [TamanhoService],
    exports: [TamanhoService],
})
export class TamanhoModule {}
