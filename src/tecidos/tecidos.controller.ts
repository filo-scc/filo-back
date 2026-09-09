import {
    Controller,
    Post,
    Body,
    Get,
    ParseIntPipe,
    Param,
    Delete,
    Put,
    UseGuards,
    NotFoundException,
} from "@nestjs/common";
import { TecidosService } from "./tecidos.service";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateTecidosDto } from "./dto/create-tecidos.dto";
import { UpdateTecidosDto } from "./dto/update-tecidos.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("tecidos")
export class TecidosController {
    constructor(private readonly tecidosService: TecidosService) {}

    private getFabricoId(user: AuthenticatedUser): number {
        if (!user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return user.fabrico_id;
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Post()
    create(@Body() data: CreateTecidosDto, @CurrentUser() user: AuthenticatedUser) {
        return this.tecidosService.create(data, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.tecidosService.findAll(this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.tecidosService.findOne(id, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("fabrico/:idFabrico")
    findAllByFabrico(
        @Param("idFabrico", ParseIntPipe) idFabrico: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const fabricoId = this.getFabricoId(user);

        if (idFabrico !== fabricoId) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return this.tecidosService.findAllByFabrico(idFabrico);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateTecidosDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.tecidosService.update(id, data, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.tecidosService.remove(id, this.getFabricoId(user));
    }
}
