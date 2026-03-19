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
import { CreateClienteProdutoDto } from "./dto/create-clienteproduto.dto";
import { UpdateClienteProdutoDto } from "./dto/update-clienteproduto.dto";

@UseGuards(JwtAuthGuard)
@Controller("clientes")
export class ClienteController {
    constructor(private readonly clienteService: ClienteService) {}

    @Get("vinculos-produtos/:id")
    getAllByClientebyProduct(@Param("id", ParseIntPipe) id: number) {
        return this.clienteService.getAllClienteByProduct(id);
    }

    @Post()
    create(@Body() data: CreateClienteDto) {
        return this.clienteService.create(data);
    }

    @Get("/fabrico/:fabrico_id")
    findAllByFabricoID(@Param("fabrico_id", ParseIntPipe) fabrico_id: number) {
        return this.clienteService.findAllByFabricoID(fabrico_id);
    }

    @Get()
    findAllClientes() {
        return this.clienteService.findAll();
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.clienteService.findOne(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateClienteDto) {
        return this.clienteService.update(id, data);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.clienteService.remove(id);
    }

    @Post(":id/produtos")
    linkClienteToProduct(
        @Param("id", ParseIntPipe) cliente_id: number,
        @Body() dto: CreateClienteProdutoDto,
    ) {
        return this.clienteService.linkClientProduct(cliente_id, dto);
    }

    @Get(":id/produtos")
    getAllProductByCliente(@Param("id", ParseIntPipe) id: number) {
        return this.clienteService.getAllProductByCliente(id);
    }

    @Delete(":clienteId/produtos/:produtoId")
    deleteLinkClienteProduct(
        @Param("clienteId", ParseIntPipe) cliente_id: number,
        @Param("produtoId", ParseIntPipe) produto_id: number,
    ) {
        return this.clienteService.removeLink(cliente_id, produto_id);
    }

    @Put(":id/produtos/:produtoId")
    async updateLinkInformation(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateClienteProdutoDto) {
        return await this.clienteService.updateLink(id, data);
    }
}
