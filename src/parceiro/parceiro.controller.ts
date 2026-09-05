import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Req } from "@nestjs/common";
import { ParceiroService } from "./parceiro.service";
import { CreateParceiroDto } from "./dto/create-parceiro.dto";
import { UpdateParceiroDto } from "./dto/update-parceiro.dto";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("parceiros")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
export class ParceiroController {
    constructor(private readonly parceiroService: ParceiroService) {}

    @Post()
    create(@Req() req: any, @Body() data: CreateParceiroDto) {
        return this.parceiroService.create(data, req.user.fabrico_id);
    }

    @Get("fabrico/:id")
    findAllparceiroByFabrico(@Req() req: any) {
        return this.parceiroService.getAllparceiroByFabrico(req.user.fabrico_id);
    }

    @Get()
    findAll(@Req() req: any) {
        return this.parceiroService.getAll(req.user.fabrico_id);
    }

    @Get("categoria/:categoria")
    async getByCategoria(@Req() req: any, @Param("categoria") categoria: string) {
        return this.parceiroService.getParceirosByFabricoECategoria(
            req.user.fabrico_id,
            categoria,
        );
    }

    @Get(":id")
    findOne(@Req() req: any, @Param("id") id: string) {
        return this.parceiroService.getById(+id, req.user.fabrico_id);
    }

    @Put(":id")
    update(@Req() req: any, @Param("id") id: string, @Body() data: UpdateParceiroDto) {
        return this.parceiroService.update(+id, data, req.user.fabrico_id);
    }

    @Delete(":id")
    remove(@Req() req: any, @Param("id") id: string) {
        return this.parceiroService.delete(+id, req.user.fabrico_id);
    }

    @Get("fabrico/:fabricoId/categoria/:categoria")
    async getByFabricoECategoria(@Req() req: any, @Param("categoria") categoria: string) {
        return this.parceiroService.getParceirosByFabricoECategoria(
            req.user.fabrico_id,
            categoria,
        );
    }
}
