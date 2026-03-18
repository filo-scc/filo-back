import { Module } from "@nestjs/common";
import { ClienteService } from "./cliente.service";
import { ClienteController } from "./cliente.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
    controllers: [ClienteController],
    providers: [ClienteService],
    imports: [PrismaModule],
})
export class ClienteModule {}
