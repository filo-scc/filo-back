import { Module } from "@nestjs/common";
import { ParceiroService } from "./faccao.service";
import { ParceiroController } from "./faccao.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "src/prisma/prisma.service";
import { FaccaoProdutoController } from "./faccaoProduto.controller";
import { ParceiroProdutoService } from "./faccaoProduto.service";
import { EnderecoModule } from "src/endereco/endereco.module";
import { ProdutoModule } from "src/produto/produto.module";

@Module({
    imports: [PrismaModule, ProdutoModule, EnderecoModule, ProdutoModule],
    controllers: [ParceiroController, FaccaoProdutoController],
    providers: [ParceiroService, ParceiroProdutoService, PrismaService],
})
export class FaccaoModule {}
