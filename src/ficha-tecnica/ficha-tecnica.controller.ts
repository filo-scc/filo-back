import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    UseGuards,
    Put,
    ParseIntPipe,
    Req,
} from "@nestjs/common";
import { FichaTecnicaService } from "./ficha-tecnica.service";
import { CreateFichaTecnicaDto } from "./dto/create-ficha-tecnica.dto";
import { UpdateFichaTecnicaDto } from "./dto/update-ficha-tecnica.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("fichas-tecnicas")
export class FichaTecnicaController {
    constructor(private readonly fichaTecnicaService: FichaTecnicaService) {}

    @Post()
    create(@Body() data: CreateFichaTecnicaDto, @Req() req: Request) {
        return this.fichaTecnicaService.create(data, (req as any).user.fabrico_id);
    }

    @Get("/fabrico/:id")
    findAllByFabricoId(@Param("id", ParseIntPipe) id: number) {
        return this.fichaTecnicaService.findAllByFabricoId(id);
    }

    @Get("/etapa/:id")
    findAllByEtapaId(@Param("id", ParseIntPipe) id: number) {
        return this.fichaTecnicaService.findAllByEtapaId(id);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.fichaTecnicaService.findOne(+id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateFichaTecnicaDto, @Req() req: Request) {
        return this.fichaTecnicaService.update(+id, data, (req as any).user.fabrico_id);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.fichaTecnicaService.remove(id);
    }
}
