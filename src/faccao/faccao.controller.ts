import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from "@nestjs/common";
import { ParceiroService } from "./faccao.service";
import { CreateParceiroDto } from "./dto/create-faccao.dto";
import { UpdateParceiroDto } from "./dto/update-faccao.dto";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("faccoes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
export class ParceiroController {
    constructor(private readonly parceiroService: ParceiroService) {}

    @Post()
    create(@Body() data: CreateParceiroDto) {
        return this.parceiroService.create(data);
    }

    @Get("fabrico/:id")
    findAllparceiroByFabrico(@Param("id") id: string) {
        return this.parceiroService.getAllparceiroByFabrico(Number(id));
    }

    @Get()
    findAll() {
        return this.parceiroService.getAll();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.parceiroService.getById(+id);
    }

    @Put(":id")
    update(@Param("id") id: string, @Body() data: UpdateParceiroDto) {
        return this.parceiroService.update(+id, data);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.parceiroService.delete(+id);
    }
}
