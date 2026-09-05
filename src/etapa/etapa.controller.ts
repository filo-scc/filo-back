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
    NotFoundException,
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

    private getFabricoId(user: AuthenticatedUser): number {
        if (!user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return user.fabrico_id;
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Post()
    create(@Body() data: CreateEtapaDto, @CurrentUser() user: AuthenticatedUser) {
        return this.etapaService.create(data, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get()
    getAll(@CurrentUser() user: AuthenticatedUser) {
        return this.etapaService.findAllByFabricoID(this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("fabrico/:fabrico_id")
    findAllByFabricoID(
        @Param("fabrico_id", ParseIntPipe) fabrico_id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const currentFabricoId = this.getFabricoId(user);

        if (fabrico_id !== currentFabricoId) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return this.etapaService.findAllByFabricoID(currentFabricoId);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.etapaService.getById(id, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateEtapaDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.etapaService.update(id, data, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.etapaService.delete(id, this.getFabricoId(user));
    }
}
