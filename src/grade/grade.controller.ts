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
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

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
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.gradeService.findAll(user);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.gradeService.findOne(id, user);
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
