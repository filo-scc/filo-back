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
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("aviamentos")
export class AviamentoController {
    constructor(private readonly aviamentoService: AviamentoService) {}

    @Post()
    create(@Body() data: CreateAviamentoDto, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.aviamentoService.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: BusinessAuthenticatedUser) {
        return this.aviamentoService.findAll(user);
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.aviamentoService.getById(id, user);
    }

    @Get("/fabrico/:fabrico_id")
    findAllFabrico(
        @Param("fabrico_id", ParseIntPipe) fabrico_id: number,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.aviamentoService.findAllFabrico(fabrico_id, user);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.aviamentoService.delete(id, user);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateAviamentoDto,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.aviamentoService.update(id, data, user);
    }
}
