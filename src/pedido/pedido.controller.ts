import {
    Controller,
    Post,
    Body,
    Get,
    ParseIntPipe,
    Param,
    Delete,
    Put,
    Headers,
    UseGuards,
} from "@nestjs/common";
import { PedidoService } from "./pedido.service";
import { CreatePedidoDto } from "./dto/create-pedido.dto";
import { CreatePedidoCompletoDto } from "./dto/create-pedido-completo.dto";
import { UpdatePedidoDto } from "./dto/update-pedido.dto";
import { UpdatePedidoCompletoDto } from "./dto/update-pedido-completo.dto";
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
    async create(@Body() createPedidoDto: CreatePedidoDto, @CurrentUser() user: AuthenticatedUser) {
        return this.pedidoService.create(createPedidoDto, user);
    }

    @Post("completo")
    async createCompleto(
        @Body() createPedidoCompletoDto: CreatePedidoCompletoDto,
        @CurrentUser() user: AuthenticatedUser,
        @Headers("idempotency-key") idempotencyKey?: string,
    ) {
        return this.pedidoService.createCompleto(createPedidoCompletoDto, user, idempotencyKey);
    }

    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.pedidoService.findAll(user);
    }

    @Get("/cliente/:cliente_id")
    findAllCliente(
        @Param("cliente_id", ParseIntPipe) cliente_id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.pedidoService.findAllCliente(cliente_id, user);
    }

    @Put("completo/:id")
    updateCompleto(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdatePedidoCompletoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.pedidoService.updateCompleto(id, data, user);
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.pedidoService.getById(id, user);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.pedidoService.delete(id, user);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdatePedidoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.pedidoService.update(id, data, user);
    }
}
