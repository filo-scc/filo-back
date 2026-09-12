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
import { ParceiroService } from "./parceiro.service";
import { CreateParceiroDto } from "./dto/create-parceiro.dto";
import { UpdateParceiroDto } from "./dto/update-parceiro.dto";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

@Controller("parceiros")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
export class ParceiroController {
    constructor(private readonly parceiroService: ParceiroService) {}

    @Post()
    create(@Body() data: CreateParceiroDto, @CurrentUser() user: AuthenticatedUser) {
        return this.parceiroService.create(data, user);
    }

    @Get("fabrico/:id")
    findAllparceiroByFabrico(
        @Param("id", ParseIntPipe) id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.parceiroService.getAllparceiroByFabrico(id, user);
    }

    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.parceiroService.getAll(user);
    }

    @Get("categoria/:categoria")
    async getByCategoria(
        @CurrentUser() user: AuthenticatedUser,
        @Param("categoria") categoria: string,
    ) {
        return this.parceiroService.getParceirosByFabricoECategoria(categoria, user);
    }

    @Get(":id")
    findOne(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseIntPipe) id: number) {
        return this.parceiroService.getById(id, user);
    }

    @Put(":id")
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateParceiroDto,
    ) {
        return this.parceiroService.update(id, data, user);
    }

    @Delete(":id")
    remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseIntPipe) id: number) {
        return this.parceiroService.delete(id, user);
    }

    @Get("fabrico/:fabricoId/categoria/:categoria")
    async getByFabricoECategoria(
        @Param("fabricoId", ParseIntPipe) fabricoId: number,
        @Param("categoria") categoria: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.parceiroService.getParceirosByFabricoECategoria(categoria, user, fabricoId);
    }
}
