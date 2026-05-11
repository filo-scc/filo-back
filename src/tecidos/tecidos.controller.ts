import { Controller, Post, Body, Get, ParseIntPipe, Param, Delete, Put } from "@nestjs/common";
import { TecidosService } from "./tecidos.service";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { CreateTecidosDto } from "./dto/create-tecidos.dto";
import { UpdateTecidosDto } from "./dto/update-tecidos.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("tecidos")
@Roles("PROPRIETARIO", "GERENTE")
export class TecidosController {
    constructor(private readonly tecidosService: TecidosService) {}

    @Post()
    create(@Body() data: CreateTecidosDto) {
        return this.tecidosService.create(data);
    }

    @Get()
    findAll() {
        return this.tecidosService.findAll();
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.tecidosService.findOne(id);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.tecidosService.remove(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateTecidosDto) {
        return this.tecidosService.update(id, data);
    }
}
