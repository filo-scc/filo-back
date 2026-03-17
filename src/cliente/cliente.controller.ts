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
    findAll(@Param("fabrico_id") fabrico_id: number) {
        return this.clienteService.findAll(Number(fabrico_id));
    }

    @Get("/fabrico/:fabrico_id/:id")
    findOne(@Param("fabrico_id") fabrico_id: number, @Param("id") id: number) {
        return this.clienteService.findOne(Number(fabrico_id), +id);
    }

    @Put("/fabrico/:fabrico_id/:id")
    update(
        @Body() { fabrico_id }: { fabrico_id: number },
        @Param("id") id: number,
        @Body() updateClienteDto: UpdateClienteDto,
    ) {
        return this.clienteService.update(Number(fabrico_id), +id, updateClienteDto);
    }

    @Delete("/fabrico/:fabrico_id/:id")
    remove(@Param("fabrico_id") fabrico_id: number, @Param("id") id: number) {
        return this.clienteService.remove(Number(fabrico_id), +id);
    }
}
