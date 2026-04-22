import { Module } from "@nestjs/common";
import { IconeService } from "./icone.service";
import { IconeController } from "./icone.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [IconeController],
    providers: [IconeService],
})
export class IconeModule {}
