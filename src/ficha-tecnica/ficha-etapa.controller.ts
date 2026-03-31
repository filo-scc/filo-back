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

@Controller("ficha-etapas")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FichaEtapaController {
    constructor(private readonly fichaEtapaService: FichaEtapaService) {}

    @Roles("DONO", "MEMBRO")
    @Post()
    createFichaEtapa(@Body() data: CreateFichaEtapaDto,) {
        return this.fichaEtapaService.createFichaEtapa(data);
    }

    @Roles("DONO", "MEMBRO")
    @Delete(":ficha_etapa_id")
    deleteFichaEtapa(
        @Param("ficha_etapa_id", ParseIntPipe) idFichaEtapa: number,
    ) {
        return this.fichaEtapaService.deleteFichaEtapa(idFichaEtapa);
    }

    @Roles("DONO", "MEMBRO")
    @Get("/ficha-tecnica/:ficha_tecnica_id")
    getFichaTecnicaByFichaEtapa(@Param("ficha_tecnica_id", ParseIntPipe) idFichaTecnica: number) {
        return this.fichaEtapaService.getByFichaTecnica(idFichaTecnica);
    }

    @Roles("DONO", "MEMBRO")
    @Get("/etapa/:etapa_id")
    getEtapaByFichaEtapa(@Param("etapa_id", ParseIntPipe) idEtapa: number) {
        return this.fichaEtapaService.getByEtapa(idEtapa);
    }

    @Roles("DONO", "MEMBRO")
    @Put(":ficha_etapa_id")
    updateFichaEtapa( 
        @Param("ficha_etapa_id", ParseIntPipe) idFichaEtapa: number,
        @Body() data: UpdateFichaEtapaDto,) {
        return this.fichaEtapaService.updateFichaEtapa(idFichaEtapa, data);
    }
}
