import { Module } from "@nestjs/common";
import { FichaTecnicaService } from "./ficha-tecnica.service";
import { FichaTecnicaController } from "./ficha-tecnica.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { ProdutoModule } from "src/produto/produto.module";
import { EtapaModule } from "src/etapa/etapa.module";
import { FichaEtapaController } from "./ficha-etapa.controller";
import { FichaEtapaService } from "./ficha-etapa.service";
import { FabricoModule } from "src/fabrico/fabrico.module";

@Module({
    imports: [PrismaModule, ProdutoModule, EtapaModule, FabricoModule],
    controllers: [FichaTecnicaController, FichaEtapaController],
    providers: [FichaTecnicaService, FichaEtapaService],
})
export class FichaTecnicaModule {}
