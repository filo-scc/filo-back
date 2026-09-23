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
    Req,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { FichaEtapaService } from "./ficha-etapa.service";
import { CreateFichaEtapaDto } from "./dto/create-ficha-etapa.dto";
import { UpdateFichaEtapaDto } from "./dto/update-ficha-etapa.dto";

@Controller("fichas-etapas")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FichaEtapaController {
    constructor(private readonly fichaEtapaService: FichaEtapaService) {}

    @Roles("PROPRIETARIO", "GERENTE")
    @Post()
    createFichaEtapa(@Body() data: CreateFichaEtapaDto, @Req() req: Request) {
        return this.fichaEtapaService.createFichaEtapa(data, (req as any).user.fabrico_id);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Delete(":ficha_etapa_id")
    deleteFichaEtapa(
        @Param("ficha_etapa_id", ParseIntPipe) idFichaEtapa: number,
        @Req() req: Request,
    ) {
        return this.fichaEtapaService.deleteFichaEtapa(idFichaEtapa, (req as any).user.fabrico_id);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("/ficha-tecnica/:ficha_tecnica_id")
    getFichaTecnicaByFichaEtapa(
        @Param("ficha_tecnica_id", ParseIntPipe) idFichaTecnica: number,
        @Req() req: Request,
    ) {
        return this.fichaEtapaService.getByFichaTecnica(
            idFichaTecnica,
            (req as any).user.fabrico_id,
        );
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("/etapa/:etapa_id")
    getEtapaByFichaEtapa(@Param("etapa_id", ParseIntPipe) idEtapa: number, @Req() req: Request) {
        return this.fichaEtapaService.getByEtapa(idEtapa, (req as any).user.fabrico_id);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Put(":ficha_etapa_id/finalizar")
    finalizarFichaEtapa(
        @Param("ficha_etapa_id", ParseIntPipe) idFichaEtapa: number,
        @Req() req: Request,
    ) {
        return this.fichaEtapaService.finalizarFichaEtapa(
            idFichaEtapa,
            (req as any).user.fabrico_id,
        );
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Put(":ficha_etapa_id")
    updateFichaEtapa(
        @Param("ficha_etapa_id", ParseIntPipe) idFichaEtapa: number,
        @Body() data: UpdateFichaEtapaDto,
        @Req() req: Request,
    ) {
        return this.fichaEtapaService.updateFichaEtapa(
            idFichaEtapa,
            data,
            (req as any).user.fabrico_id,
        );
    }
}
