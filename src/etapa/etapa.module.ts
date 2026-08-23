import { Module } from "@nestjs/common";
import { EtapaService } from "./etapa.service";
import { EtapaController } from "./etapa.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { IconeModule } from "./icone.module";
import { ProdutoModule } from "src/produto/produto.module";

@Module({
    imports: [PrismaModule, IconeModule, ProdutoModule],
    controllers: [EtapaController],
    providers: [EtapaService],
    exports: [EtapaService],
})
export class EtapaModule {}
