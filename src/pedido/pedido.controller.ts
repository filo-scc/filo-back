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
    ForbiddenException,
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

    private resolverFabricoId(user: AuthenticatedUser): number {
        if (user.fabrico_id == null) {
            throw new ForbiddenException("Usuário não está vinculado a um fabrico");
        }

        return user.fabrico_id;
    }

    @Post()
    async create(@Body() createPedidoDto: CreatePedidoDto, @CurrentUser() user: AuthenticatedUser) {
        return this.pedidoService.create(createPedidoDto, this.resolverFabricoId(user));
    }

    @Post("completo")
    async createCompleto(
        @Body() createPedidoCompletoDto: CreatePedidoCompletoDto,
        @CurrentUser() user: AuthenticatedUser,
        @Headers("idempotency-key") idempotencyKey?: string,
    ) {
        return this.pedidoService.createCompleto(
            createPedidoCompletoDto,
            this.resolverFabricoId(user),
            idempotencyKey,
        );
    }

    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.pedidoService.findAll(this.resolverFabricoId(user));
    }

    @Get("/cliente/:cliente_id")
    findAllCliente(
        @Param("cliente_id", ParseIntPipe) cliente_id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.pedidoService.findAllCliente(cliente_id, this.resolverFabricoId(user));
    }

    @Put("completo/:id")
    updateCompleto(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdatePedidoCompletoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.pedidoService.updateCompleto(id, data, this.resolverFabricoId(user));
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.pedidoService.getById(id, this.resolverFabricoId(user));
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.pedidoService.delete(id, this.resolverFabricoId(user));
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdatePedidoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.pedidoService.update(id, data, this.resolverFabricoId(user));
    }
}
