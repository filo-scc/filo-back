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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("fabrico-grades")
export class FabricoGradeController {
    constructor(private readonly fabricoGradeService: FabricoGradeService) {}

    @Post()
    create(@Body() data: CreateFabricoGradeDto) {
        return this.fabricoGradeService.create(data);
    }

    @Get()
    findAll() {
        return this.fabricoGradeService.findAll();
    }

    @Roles("PROPIETARIO", "GERENTE")
    @Get("fabrico/:fabrico_id")
    findAllByFabricoID(@Param("fabrico_id", ParseIntPipe) fabrico_id: number) {
        return this.fabricoGradeService.findAllByFabricoID(fabrico_id);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.fabricoGradeService.findOne(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateFabricoGradeDto) {
        return this.fabricoGradeService.update(id, data);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.fabricoGradeService.remove(id);
    }
}
