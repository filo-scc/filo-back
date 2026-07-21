import { Module } from "@nestjs/common";
import { ParceiroService } from "./parceiro.service";
import { ParceiroController } from "./parceiro.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "src/prisma/prisma.service";
import { ParceiroProdutoController } from "./parceiroProduto.controller";
import { ParceiroProdutoService } from "./parceiroProduto.service";
import { EnderecoModule } from "src/endereco/endereco.module";
import { ProdutoModule } from "src/produto/produto.module";

@Module({
    imports: [PrismaModule, ProdutoModule, EnderecoModule, ProdutoModule],
    controllers: [ParceiroController, ParceiroProdutoController],
    providers: [ParceiroService, ParceiroProdutoService, PrismaService],
})
export class ParceiroModule {}
