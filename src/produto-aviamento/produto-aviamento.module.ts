import { Module } from "@nestjs/common";
import { ProdutoAviamentoService } from "./produto-aviamento.service";
import { ProdutoAviamentoController } from "./produto-aviamento.controller";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [ProdutoAviamentoController],
    providers: [ProdutoAviamentoService],
})
export class ProdutoAviamentoModule {}
