import { Controller, Get, Post, Body, Param, Delete, Put } from "@nestjs/common";
import { ClienteService } from "./cliente.service";
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { UpdateClienteDto } from "./dto/update-cliente.dto";

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
    update(
        @Body() { fabrico_id }: { fabrico_id: number },
        @Param("id") id: number,
        @Body() updateClienteDto: UpdateClienteDto,
    ) {
        return this.clienteService.update(Number(fabrico_id), +id, updateClienteDto);
    }

    @Delete(":id")
    remove(@Param("fabrico_id") fabrico_id: number, @Param("id") id: number) {
        return this.clienteService.remove(Number(fabrico_id), +id);
    }
}
