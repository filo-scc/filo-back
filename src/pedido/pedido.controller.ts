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
} from "@nestjs/common";
import { PedidoService } from "./pedido.service";
import { CreatePedidoDto } from "./dto/create-pedido.dto";
import { CreatePedidoCompletoDto } from "./dto/create-pedido-completo.dto";
import { UpdatePedidoDto } from "./dto/update-pedido.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("pedidos")
export class PedidoController {
    constructor(private readonly pedidoService: PedidoService) {}

    @Post()
    async create(
        @Body() createPedidoDto: CreatePedidoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.pedidoService.create(createPedidoDto, user.fabrico_id!);
    }

    @Post("completo")
    async createCompleto(
        @Body() createPedidoCompletoDto: CreatePedidoCompletoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.pedidoService.createCompleto(createPedidoCompletoDto, user.fabrico_id!);
    }

    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.pedidoService.findAll(user.fabrico_id!);
    }

    @Get("/cliente/:cliente_id")
    findAllCliente(
        @Param("cliente_id", ParseIntPipe) cliente_id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.pedidoService.findAllCliente(cliente_id, user.fabrico_id!);
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.pedidoService.getById(id, user.fabrico_id!);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.pedidoService.delete(id, user.fabrico_id!);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdatePedidoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.pedidoService.update(id, data, user.fabrico_id!);
    }
}
