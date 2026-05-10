import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    UseGuards,
    ParseIntPipe,
} from "@nestjs/common";
import { GradeVersaoService } from "./grade-versao.service";
import { CreateGradeVersaoDto } from "src/grade/dto/create-grade-versao.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "PROPRIETARIO", "GERENTE")
@Controller("grade-versoes")
export class GradeVersaoController {
    constructor(private readonly gradeVersaoService: GradeVersaoService) {}

    @Roles("ADMIN")
    @Post("grade/:grade_id")
    createFromGrade(
        @Param("grade_id", ParseIntPipe) grade_id: number,
        @Body() data: CreateGradeVersaoDto,
    ) {
        return this.gradeVersaoService.createFromGrade(grade_id, data);
    }

    @Get("grade/:grade_id")
    findAllByGradeID(@Param("grade_id", ParseIntPipe) grade_id: number) {
        return this.gradeVersaoService.findAllByGradeID(grade_id);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.gradeVersaoService.findOne(id);
    }

    @Roles("ADMIN")
    @Put(":id/ativar")
    activate(@Param("id", ParseIntPipe) id: number) {
        return this.gradeVersaoService.activate(id);
    }

    @Roles("ADMIN")
    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.gradeVersaoService.remove(id);
    }
}
