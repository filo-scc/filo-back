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
} from "@nestjs/common";
import { FichaTecnicaService } from "./ficha-tecnica.service";
import { CreateFichaTecnicaDto } from "./dto/create-ficha-tecnica.dto";
import { UpdateFichaTecnicaDto } from "./dto/update-ficha-tecnica.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("fichas-tecnicas")
export class FichaTecnicaController {
    constructor(private readonly fichaTecnicaService: FichaTecnicaService) {}

    @Post()
    create(@Body() data: CreateFichaTecnicaDto, @CurrentUser() user: AuthenticatedUser) {
        return this.fichaTecnicaService.create(data, user);
    }

    @Get()
    findAllByFabricoId(@CurrentUser() user: AuthenticatedUser) {
        return this.fichaTecnicaService.findAllByFabricoId(user.fabrico_id!);
    }

    @Get("/etapa/:id")
    findAllByEtapaId(
        @Param("id", ParseIntPipe) id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.fichaTecnicaService.findAllByEtapaId(id, user.fabrico_id!);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.fichaTecnicaService.findOne(+id, user.fabrico_id!);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateFichaTecnicaDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.fichaTecnicaService.update(+id, data, user);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.fichaTecnicaService.remove(id, user);
    }
}
