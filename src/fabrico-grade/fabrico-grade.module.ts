import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { FabricoGradeController } from "./fabrico-grade.controller";
import { FabricoGradeService } from "./fabrico-grade.service";

@Module({
    imports: [PrismaModule],
    controllers: [FabricoGradeController],
    providers: [FabricoGradeService],
    exports: [FabricoGradeService],
})
export class FabricoGradeModule {}
