import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common";
import { ClienteService } from "./cliente.service";
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { UpdateClienteDto } from "./dto/update-cliente.dto";

@Controller("cliente")
export class ClienteController {
    constructor(private readonly clienteService: ClienteService) {}

    @Post()
    create(@Body() data: CreateClienteDto, @Query("fabrico_id") fabrico_id: number) {
        return this.clienteService.create(data, Number(fabrico_id));
    }

    @Get()
    findAll(@Query("fabrico_id") fabrico_id: number) {
        return this.clienteService.findAll(Number(fabrico_id));
    }

    @Get(":id")
    findOne(@Query("fabrico_id") fabrico_id: number, @Param("id") id: number) {
        return this.clienteService.findOne(Number(fabrico_id), +id);
    }

    @Patch(":id")
    update(
        @Query("fabrico_id") fabrico_id: number,
        @Param("id") id: number,
        @Body() updateClienteDto: UpdateClienteDto,
    ) {
        return this.clienteService.update(Number(fabrico_id), +id, updateClienteDto);
    }

    @Delete(":id")
    remove(@Query("fabrico_id") fabrico_id: number, @Param("id") id: number) {
        return this.clienteService.remove(Number(fabrico_id), +id);
    }
}
