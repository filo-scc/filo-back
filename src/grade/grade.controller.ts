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
import { GradeService } from "./grade.service";
import { CreateGradeDto } from "./dto/create-grade.dto";
import { UpdateGradeDto } from "./dto/update-grade.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "PROPRIETARIO", "GERENTE")
@Controller("grades")
export class GradeController {
    constructor(private readonly gradeService: GradeService) {}

    @Roles("ADMIN")
    @Post()
    create(@Body() data: CreateGradeDto) {
        return this.gradeService.create(data);
    }

    @Get()
    findAll() {
        return this.gradeService.findAll();
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.gradeService.findOne(id);
    }

    @Roles("ADMIN")
    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateGradeDto) {
        return this.gradeService.update(id, data);
    }

    @Roles("ADMIN")
    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.gradeService.remove(id);
    }
}
