import { Module } from "@nestjs/common";
import { ProdutoAviamentoService } from "./produto-aviamento.service";
import { ProdutoAviamentoController } from "./produto-aviamento.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { ProdutoModule } from "src/produto/produto.module";

@Module({
    imports: [PrismaModule, ProdutoModule],
    controllers: [ProdutoAviamentoController],
    providers: [ProdutoAviamentoService],
})
export class ProdutoAviamentoModule {}
