import { Module } from "@nestjs/common";
import { FichaTecnicaService } from "./ficha-tecnica.service";
import { FichaTecnicaController } from "./ficha-tecnica.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { ProdutoModule } from "src/produto/produto.module";
import { EtapaModule } from "src/etapa/etapa.module";

@Module({
    imports: [PrismaModule, ProdutoModule, EtapaModule],
    controllers: [FichaTecnicaController],
    providers: [FichaTecnicaService],
})
export class FichaTecnicaModule {}
