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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "MEMBRO")
@Controller("clientes-produtos")
export class ClienteProdutoController {
    constructor(private readonly clienteProdutoService: ClienteProdutoService) {}

    @Get("/cliente/:clienteId")
    getAllProdutoByCliente(@Param("clienteId", ParseIntPipe) cliente_id: number) {
        return this.clienteProdutoService.getAllProdutoByCliente(cliente_id);
    }

    @Get("/produto/:produtoId")
    getAllClienteByProduto(@Param("produtoId", ParseIntPipe) produto_id: number) {
        return this.clienteProdutoService.getAllClienteByProduto(produto_id);
    }

    @Post("/:clienteId/:produtoId")
    vincularClienteToProduto(
        @Param("clienteId", ParseIntPipe) cliente_id: number,
        @Param("produtoId", ParseIntPipe) produto_id: number,
        @Body() dto: CreateClienteProdutoDto,
    ) {
        return this.clienteProdutoService.vincularClienteProduto(cliente_id, produto_id, dto);
    }

    @Delete("/:clienteId/:produtoId")
    deleteVinculoClienteProduto(
        @Param("clienteId", ParseIntPipe) cliente_id: number,
        @Param("produtoId", ParseIntPipe) produto_id: number,
    ) {
        return this.clienteProdutoService.removeClienteProduto(cliente_id, produto_id);
    }

    @Put("/:clienteId/:produtoId")
    async atualizarInformacaoDoVinculo(
        @Param("clienteId", ParseIntPipe) cliente_id: number,
        @Param("produtoId", ParseIntPipe) produto_id: number,
        @Body() data: UpdateClienteProdutoDto,
    ) {
        return this.clienteProdutoService.updateClienteProduto(cliente_id, produto_id, data);
    }
}
