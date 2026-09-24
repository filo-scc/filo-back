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
import { FabricoGradeService } from "./fabrico-grade.service";
import { CreateFabricoGradeDto } from "./dto/create-fabrico-grade.dto";
import { UpdateFabricoGradeDto } from "./dto/update-fabrico-grade.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("fabrico-grades")
export class FabricoGradeController {
    constructor(private readonly fabricoGradeService: FabricoGradeService) {}

    @Post()
    create(@Body() data: CreateFabricoGradeDto, @CurrentUser() user: AuthenticatedUser) {
        return this.fabricoGradeService.create(data, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.fabricoGradeService.findAll(user);
    }

    @Roles("ADMIN")
    @Get("fabrico/:fabricoId")
    findAllByFabricoID(
        @Param("fabricoId", ParseIntPipe) fabricoId: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.fabricoGradeService.findAll(user, fabricoId);
    }

    @Roles("PROPRIETARIO", "GERENTE", "ADMIN")
    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.fabricoGradeService.findOne(id, user);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateFabricoGradeDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.fabricoGradeService.update(id, data, user);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.fabricoGradeService.remove(id, user);
    }
}
