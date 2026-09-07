import { Controller, Post, Body, Get, ParseIntPipe, Param, Delete, Put } from "@nestjs/common";
import { TecidosService } from "./tecidos.service";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { CreateTecidosDto } from "./dto/create-tecidos.dto";
import { UpdateTecidosDto } from "./dto/update-tecidos.dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("tecidos")
@Roles("PROPRIETARIO", "GERENTE")
export class TecidosController {
    constructor(private readonly tecidosService: TecidosService) {}

    @Post()
    create(@Body() data: CreateTecidosDto, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.tecidosService.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: BusinessAuthenticatedUser) {
        return this.tecidosService.findAll(user);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.tecidosService.findOne(id, user);
    }

    @Get("fabrico/:idFabrico")
    findAllByFabrico(
        @Param("idFabrico", ParseIntPipe) idFabrico: number,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.tecidosService.findAllByFabrico(idFabrico, user);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.tecidosService.remove(id, user);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateTecidosDto,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.tecidosService.update(id, data, user);
    }
}
