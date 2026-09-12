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
        return this.clienteService.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: BusinessAuthenticatedUser) {
        return this.clienteService.findAllByFabricoID(user);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.clienteService.findOne(id, user);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateClienteDto,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.clienteService.update(id, data, user);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.clienteService.remove(id, user);
    }
}
