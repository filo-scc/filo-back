import { Module } from "@nestjs/common";
import { TecidosService } from "./tecidos.service";
import { TecidosController } from "./tecidos.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { ProdutoModule } from "src/produto/produto.module";

@Module({
    imports: [PrismaModule, ProdutoModule],
    providers: [TecidosService],
    controllers: [TecidosController],
    exports: [TecidosService],
})
export class TecidosModule {}
