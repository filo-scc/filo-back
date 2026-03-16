import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from "@nestjs/common";
import { ClienteService } from "./cliente.service";
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { UpdateClienteDto } from "./dto/update-cliente.dto";

@Controller("cliente")
export class ClienteController {
    constructor(private readonly clienteService: ClienteService) {}

    @Post()
    create(@Body() data: CreateClienteDto, @Req() req: any) {
        return this.clienteService.create(data, req.user.fabrico_id);
    }

    @Get()
    findAll(@Req() req: any) {
        return this.clienteService.findAll(req.user.fabrico_id);
    }

    @Get(":id")
    findOne(@Req() req: any, @Param("id") id: number) {
        return this.clienteService.findOne(req.user.fabrico_id, +id);
    }

    @Patch(":id")
    update(@Param("id") id: number, @Req() req: any, @Body() updateClienteDto: UpdateClienteDto) {
        return this.clienteService.update(req.user.fabrico_id, id, updateClienteDto);
    }

    @Delete(":id")
    remove(@Param("id") id: number, @Req() req: any) {
        return this.clienteService.remove(req.user.fabrico_id, +id);
    }
}
