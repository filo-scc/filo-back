import {
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    ParseIntPipe,
    UseGuards,
    Controller,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { FichaEtapaService } from "./ficha-etapa.service";
import { CreateFichaEtapaDto } from "./dto/create-ficha-etapa.dto";
import { UpdateFichaEtapaDto } from "./dto/update-ficha-etapa.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

@Controller("fichas-etapas")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FichaEtapaController {
    constructor(private readonly fichaEtapaService: FichaEtapaService) {}

    @Roles("PROPRIETARIO", "GERENTE")
    @Post()
    createFichaEtapa(@Body() data: CreateFichaEtapaDto, @CurrentUser() user: AuthenticatedUser) {
        return this.fichaEtapaService.createFichaEtapa(data, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Delete(":ficha_etapa_id")
    deleteFichaEtapa(
        @Param("ficha_etapa_id", ParseIntPipe) idFichaEtapa: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.fichaEtapaService.deleteFichaEtapa(idFichaEtapa, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("/ficha-tecnica/:ficha_tecnica_id")
    getFichaTecnicaByFichaEtapa(
        @Param("ficha_tecnica_id", ParseIntPipe) idFichaTecnica: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.fichaEtapaService.getByFichaTecnica(idFichaTecnica, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("/etapa/:etapa_id")
    getEtapaByFichaEtapa(
        @Param("etapa_id", ParseIntPipe) idEtapa: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.fichaEtapaService.getByEtapa(idEtapa, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Put(":ficha_etapa_id/finalizar")
    finalizarFichaEtapa(
        @Param("ficha_etapa_id", ParseIntPipe) idFichaEtapa: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.fichaEtapaService.finalizarFichaEtapa(idFichaEtapa, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Put(":ficha_etapa_id")
    updateFichaEtapa(
        @Param("ficha_etapa_id", ParseIntPipe) idFichaEtapa: number,
        @Body() data: UpdateFichaEtapaDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.fichaEtapaService.updateFichaEtapa(idFichaEtapa, data, user);
    }
}
