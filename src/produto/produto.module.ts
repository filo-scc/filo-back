import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { ProdutoController } from "./produto.controller";
import { ProdutoService } from "./produto.service";

@Module({
    imports: [PrismaModule],
    controllers: [ProdutoController],
    providers: [ProdutoService],
})
export class ProdutoModule {}
