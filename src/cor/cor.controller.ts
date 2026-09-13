import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    ParseIntPipe,
    Post,
    Put,
    UseGuards,
} from "@nestjs/common";
import { CorService } from "./cor.service";
import { CreateCorDto } from "./dto/create-cor.dto";
import { UpdateCorDto } from "./dto/update-cor.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("cores")
export class CorController {
    constructor(private readonly corService: CorService) {}

    @Roles("PROPRIETARIO", "GERENTE")
    @Post()
    create(@Body() data: CreateCorDto, @CurrentUser() user: AuthenticatedUser) {
        return this.corService.create(data, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.corService.findAll(user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("fabrico/:fabrico_id")
    findAllByFabricoID(
        @Param("fabrico_id", ParseIntPipe) fabrico_id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const currentFabricoId = user.fabrico_id;

        if (fabrico_id !== currentFabricoId) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return this.corService.findAllByFabricoID(currentFabricoId);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.corService.findOne(id, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateCorDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.corService.update(id, data, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.corService.remove(id, user);
    }
}
