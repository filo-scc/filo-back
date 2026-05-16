import { Module } from "@nestjs/common";
import { PedidoService } from "./pedido.service";
import { PedidoController } from "./pedido.controller";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    providers: [PedidoService],
    controllers: [PedidoController],
})
export class PedidoModule {}
