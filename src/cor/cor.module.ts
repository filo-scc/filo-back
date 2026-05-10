import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CorController } from "./cor.controller";
import { CorService } from "./cor.service";

@Module({
    imports: [PrismaModule],
    controllers: [CorController],
    providers: [CorService],
    exports: [CorService],
})
export class CorModule {}
