import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
    imports: [PrismaModule],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule {}
