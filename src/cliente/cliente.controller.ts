import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    UseGuards,
    ParseIntPipe,
} from "@nestjs/common";
import { ClienteService } from "./cliente.service";
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { UpdateClienteDto } from "./dto/update-cliente.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("clientes")
export class ClienteController {
    constructor(private readonly clienteService: ClienteService) {}

    @Post()
    create(@Body() data: CreateClienteDto, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.clienteService.create(data, user.fabrico_id);
    }

    @Get()
    findAll(@CurrentUser() user: BusinessAuthenticatedUser) {
        return this.clienteService.findAllByFabricoID(user.fabrico_id);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.clienteService.findOne(id, user.fabrico_id);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateClienteDto,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.clienteService.update(id, data, user.fabrico_id);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.clienteService.remove(id, user.fabrico_id);
    }
}
