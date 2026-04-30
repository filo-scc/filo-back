import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";

import { GradeController } from "./grade.controller";
import { GradeService } from "./grade.service";

import { GradeVersaoController } from "./grade-versao.controller";
import { GradeVersaoService } from "./grade-versao.service";

@Module({
    imports: [PrismaModule],
    controllers: [GradeController, GradeVersaoController],
    providers: [GradeService, GradeVersaoService],
    exports: [GradeService, GradeVersaoService],
})
export class GradeModule {}
