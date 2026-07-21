import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { TipoProdutoController } from "./tipo-produto.controller";
import { TipoProdutoService } from "./tipo-produto.service";

@Module({
    imports: [PrismaModule],
    controllers: [TipoProdutoController],
    providers: [TipoProdutoService],
    exports: [TipoProdutoService],
})
export class TipoProdutoModule {}
