import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    UseGuards,
} from "@nestjs/common";

import { AviamentoService } from "./aviamento.service";
import { CreateAviamentoDto } from "./dto/create-aviamento.dto";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { UpdateAviamentoDto } from "./dto/update-aviamento.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("aviamentos")
export class AviamentoController {
    constructor(private readonly aviamentoService: AviamentoService) {}

    @Post()
    create(@Body() data: CreateAviamentoDto) {
        return this.aviamentoService.create(data);
    }

    @Get()
    findAll() {
        return this.aviamentoService.findAll();
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.aviamentoService.getById(id);
    }

    @Get("/fabrico/:fabrico_id")
    findAllFabrico(@Param("fabrico_id", ParseIntPipe) fabrico_id: number) {
        return this.aviamentoService.findAllFabrico(fabrico_id);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.aviamentoService.delete(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateAviamentoDto) {
        return this.aviamentoService.update(id, data);
    }
}
