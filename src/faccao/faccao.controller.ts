import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from "@nestjs/common";
import { FaccaoService } from "./faccao.service";
import { CreateFaccaoDto } from "./dto/create-faccao.dto";
import { UpdateFaccaoDto } from "./dto/update-faccao.dto";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("faccoes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
export class FaccaoController {
    constructor(private readonly faccaoService: FaccaoService) {}

    @Post()
    create(@Body() data: CreateFaccaoDto) {
        return this.faccaoService.create(data);
    }

    @Get("fabrico/:id")
    findAllFaccaoByFabrico(@Param("id") id: string) {
        return this.faccaoService.getAllFaccaoByFabrico(Number(id));
    }

    @Get()
    findAll() {
        return this.faccaoService.getAll();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.faccaoService.getById(+id);
    }

    @Put(":id")
    update(@Param("id") id: string, @Body() data: UpdateFaccaoDto) {
        return this.faccaoService.update(+id, data);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.faccaoService.delete(+id);
    }
}
