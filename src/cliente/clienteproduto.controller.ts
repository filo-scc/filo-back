import { Controller, Get, Post, Body, Param, Delete, Put, ParseIntPipe } from "@nestjs/common";

import { ClienteProdutoService } from "./clienteproduto.service";
import { CreateClienteProdutoDto } from "./dto/create-clienteproduto.dto";
import { UpdateClienteProdutoDto } from "./dto/update-clienteproduto.dto";

@Controller("clientes-produtos")
export class ClienteProdutoController {
    constructor(private readonly clienteProdutoService: ClienteProdutoService) {}

    @Get(":clienteId/produtos")
    getAllProdutoByCliente(@Param("clienteId", ParseIntPipe) cliente_id: number) {
        return this.clienteProdutoService.getAllProdutoByCliente(cliente_id);
    }

    @Get("/produtos/:produtoId/clientes")
    getAllClienteByProduto(@Param("produtoId", ParseIntPipe) produto_id: number) {
        return this.clienteProdutoService.getAllClienteByProduto(produto_id);
    }

    @Post(":clienteId/produtos/:produtoId")
    vincularClienteToProduto(
        @Param("clienteId", ParseIntPipe) cliente_id: number,
        @Param("produtoId", ParseIntPipe) produto_id: number,
        @Body() dto: CreateClienteProdutoDto,
    ) {
        return this.clienteProdutoService.vincularClienteProduto(cliente_id, produto_id, dto);
    }

    @Delete(":clienteId/produtos/:produtoId")
    deleteVinculoClienteProduto(
        @Param("clienteId", ParseIntPipe) cliente_id: number,
        @Param("produtoId", ParseIntPipe) produto_id: number,
    ) {
        return this.clienteProdutoService.removeClienteProtudo(cliente_id, produto_id);
    }

    @Put(":clienteId/produtos/:produtoId")
    async atualizarInformacaoDoVinculo(
        @Param("clienteId", ParseIntPipe) cliente_id: number,
        @Param("produtoId", ParseIntPipe) produto_id: number,
        @Body() data: UpdateClienteProdutoDto,
    ) {
        return this.clienteProdutoService.updateClienteProtudo(cliente_id, produto_id, data);
    }
}
