import { Module } from "@nestjs/common";
import { TecidosService } from "./tecidos.service";
import { TecidosController } from "./tecidos.controller";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    providers: [TecidosService],
    controllers: [TecidosController],
    exports: [TecidosService],
})
export class TecidosModule {}
