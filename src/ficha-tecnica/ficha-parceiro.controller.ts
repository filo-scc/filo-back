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
    Req,
} from "@nestjs/common";
import { FichaParceiroService } from "./ficha-parceiro.service";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { CreateFichaParceiroDto } from "./dto/create-ficha-parceiro.dto";
import { UpdateFichaParceiroDto } from "./dto/update-ficha-parceiro.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("fichas-tecnicas")
export class FichaParceiroController {
    constructor(private readonly fichaParceiroService: FichaParceiroService) {}

    @Post("parceiros")
    create(@Req() req: any, @Body() data: CreateFichaParceiroDto) {
        const fabrico_id = req.user.fabrico_id;
        return this.fichaParceiroService.create(data, fabrico_id);
    }

    @Get(":ficha_id/parceiros/:parceiro_id")
    findOne(
        @Req() req: any,
        @Param("ficha_id", ParseIntPipe) ficha_id: number,
        @Param("parceiro_id", ParseIntPipe) parceiro_id: number,
    ) {
        const fabrico_id = req.user.fabrico_id;
        return this.fichaParceiroService.findOne(ficha_id, parceiro_id, fabrico_id);
    }

    @Get(":id/parceiros")
    getFichaParceiroByFicha(@Req() req: any, @Param("id", ParseIntPipe) ficha_id: number) {
        const fabrico_id = req.user.fabrico_id;
        return this.fichaParceiroService.getFichaParceiroByFicha(ficha_id, fabrico_id);
    }

    @Get("parceiro/:id/todas")
    getFichaParceiroByParceiro(@Req() req: any, @Param("id", ParseIntPipe) parceiro_id: number) {
        const fabrico_id = req.user.fabrico_id;
        return this.fichaParceiroService.getFichaParceiroByParceiro(parceiro_id, fabrico_id);
    }

    @Put(":ficha_id/parceiros/:parceiro_id")
    update(
        @Req() req: any,
        @Param("ficha_id", ParseIntPipe) ficha_id: number,
        @Param("parceiro_id", ParseIntPipe) parceiro_id: number,
        @Body() data: UpdateFichaParceiroDto,
    ) {
        const fabrico_id = req.user.fabrico_id;
        return this.fichaParceiroService.update(ficha_id, parceiro_id, data, fabrico_id);
    }

    @Delete(":ficha_id/parceiros/:parceiro_id")
    delete(
        @Req() req: any,
        @Param("ficha_id", ParseIntPipe) ficha_id: number,
        @Param("parceiro_id", ParseIntPipe) parceiro_id: number,
    ) {
        const fabrico_id = req.user.fabrico_id;
        return this.fichaParceiroService.remove(ficha_id, parceiro_id, fabrico_id);
    }
}
