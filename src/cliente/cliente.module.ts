import { Module } from "@nestjs/common";
import { ClienteService } from "./cliente.service";
import { ClienteController } from "./cliente.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { ClienteProdutoController } from "./clienteproduto.controller";
import { ClienteProdutoService } from "./clienteproduto.service";
import { ProdutoModule } from "src/produto/produto.module";
import { EnderecoModule } from "src/endereco/endereco.module"; 

@Module({
    imports: [ProdutoModule, PrismaModule, EnderecoModule], 
    controllers: [ClienteController, ClienteProdutoController],
    providers: [ClienteService, ClienteProdutoService],
    exports: [ClienteProdutoService],
})
export class ClienteModule {}