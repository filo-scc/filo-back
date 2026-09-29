import { Module } from "@nestjs/common";
import { PedidoService } from "./pedido.service";
import { PedidoController } from "./pedido.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { ProdutoModule } from "src/produto/produto.module";

@Module({
    imports: [PrismaModule, ProdutoModule],
    providers: [PedidoService],
    controllers: [PedidoController],
})
export class PedidoModule {}
