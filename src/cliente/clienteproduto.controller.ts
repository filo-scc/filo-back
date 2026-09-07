import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    ParseIntPipe,
    UseGuards,
} from "@nestjs/common";

import { ClienteProdutoService } from "./clienteproduto.service";
import { CreateClienteProdutoDto } from "./dto/create-clienteproduto.dto";
import { UpdateClienteProdutoDto } from "./dto/update-clienteproduto.dto";

import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("clientes-produtos")
export class ClienteProdutoController {
    constructor(private readonly clienteProdutoService: ClienteProdutoService) {}

    @Get("/cliente/:clienteId")
    getAllProdutoByCliente(
        @Param("clienteId", ParseIntPipe) cliente_id: number,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.clienteProdutoService.getAllProdutoByCliente(cliente_id, user.fabrico_id);
    }

    @Get("/produto/:produtoId")
    getAllClienteByProduto(
        @Param("produtoId", ParseIntPipe) produto_id: number,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.clienteProdutoService.getAllClienteByProduto(produto_id, user.fabrico_id);
    }

    @Post("/:clienteId/:produtoId")
    vincularClienteToProduto(
        @Param("clienteId", ParseIntPipe) cliente_id: number,
        @Param("produtoId", ParseIntPipe) produto_id: number,
        @Body() dto: CreateClienteProdutoDto,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.clienteProdutoService.vincularClienteProduto(
            cliente_id,
            produto_id,
            dto,
            user.fabrico_id,
        );
    }

    @Delete("/:clienteId/:produtoId")
    deleteVinculoClienteProduto(
        @Param("clienteId", ParseIntPipe) cliente_id: number,
        @Param("produtoId", ParseIntPipe) produto_id: number,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.clienteProdutoService.removeClienteProduto(
            cliente_id,
            produto_id,
            user.fabrico_id,
        );
    }

    @Put("/:clienteId/:produtoId")
    async atualizarInformacaoDoVinculo(
        @Param("clienteId", ParseIntPipe) cliente_id: number,
        @Param("produtoId", ParseIntPipe) produto_id: number,
        @Body() data: UpdateClienteProdutoDto,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.clienteProdutoService.updateClienteProduto(
            cliente_id,
            produto_id,
            data,
            user.fabrico_id,
        );
    }
}
