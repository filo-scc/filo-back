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
@Roles("PROPRIETARIO", "GERENTE")
@Controller("tecidos")
export class TecidosController {
    constructor(private readonly tecidosService: TecidosService) {}

    @Post()
    create(@Body() data: CreateTecidosDto, @CurrentUser() user: AuthenticatedUser) {
        return this.tecidosService.create(data,user);
    }

    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.tecidosService.findAll(user);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.tecidosService.findOne(id, user);
    }

    @Get("fabrico/:idFabrico")
    findAllByFabrico(
        @Param("idFabrico", ParseIntPipe) idFabrico: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const fabricoId = user.fabrico_id;

        if (idFabrico !== fabricoId) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return this.tecidosService.findAllByFabrico(user);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateTecidosDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.tecidosService.update(id, data, user);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.tecidosService.remove(id, user);
    }
}
