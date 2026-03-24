import { Module } from "@nestjs/common";
import { FaccaoService } from "./faccao.service";
import { FaccaoController } from "./faccao.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "src/prisma/prisma.service";
import { FaccaoProdutoController } from "./faccaoProduto.controller";
import { FaccaoProdutoService } from "./faccaoProduto.service";

@Module({
    imports: [PrismaModule],
    controllers: [FaccaoController, FaccaoProdutoController],
    providers: [FaccaoService, FaccaoProdutoService, PrismaService],
})
export class FaccaoModule {}
