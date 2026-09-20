import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    Put,
    Delete,
    UseGuards,
    ParseIntPipe,
} from "@nestjs/common";
import { EtapaService } from "./etapa.service";
import { CreateEtapaDto } from "./dto/create-etapa.dto";
import { UpdateEtapaDto } from "./dto/update-etapa.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("etapas")
export class EtapaController {
    constructor(private readonly etapaService: EtapaService) {}

    @Roles("ADMIN", "PROPRIETARIO", "GERENTE")
    @Post()
    create(@Body() data: CreateEtapaDto, @CurrentUser() user: AuthenticatedUser) {
        return this.etapaService.create(data, user);
    }

    @Roles("ADMIN", "PROPRIETARIO", "GERENTE")
    @Get("fabrico/:fabrico_id")
    findAllByFabricoID(
        @Param("fabrico_id", ParseIntPipe) fabrico_id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.etapaService.findAllByFabricoID(fabrico_id, user);
    }

    @Roles("ADMIN", "PROPRIETARIO", "GERENTE")
    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.etapaService.getById(id, user);
    }

    @Roles("ADMIN", "PROPRIETARIO", "GERENTE")
    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateEtapaDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.etapaService.update(id, data, user);
    }

    @Roles("ADMIN", "PROPRIETARIO", "GERENTE")
    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.etapaService.delete(id, user);
    }
}
