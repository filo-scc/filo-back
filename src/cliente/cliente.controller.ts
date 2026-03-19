import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from "@nestjs/common";
import { ClienteService } from "./cliente.service";
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { UpdateClienteDto } from "./dto/update-cliente.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("clientes")
export class ClienteController {
    constructor(private readonly clienteService: ClienteService) {}

    @Post()
    create(@Body() data: CreateClienteDto) {
        return this.clienteService.create(data);
    }

    @Get("/fabrico/:fabrico_id")
    findAllByFabricoID(@Param("fabrico_id") fabrico_id: number) {
        return this.clienteService.findAllByFabricoID(Number(fabrico_id));
    }

    @Get()
    findAllClientes() {
        return this.clienteService.findAll();
    }

    @Get(":id")
    findOne(@Param("id") id: number) {
        return this.clienteService.findOne(id);
    }

    @Put(":id")
    update(@Param("id") id: number, @Body() data: UpdateClienteDto) {
        return this.clienteService.update(id, data);
    }

    @Delete(":id")
    remove(@Param("id") id: number) {
        return this.clienteService.remove(id);
    }
}
