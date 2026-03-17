import { Controller, Post, Body, Get, Param, Put, Delete, ParseIntPipe } from "@nestjs/common";
import { EtapaService } from "./etapa.service";
import { CreateEtapaDto } from "./dto/create-etapa.dto";

@Controller("etapas")
export class EtapaController {
    constructor(private readonly etapaService: EtapaService) {}

    @Post()
    create(@Body() data: CreateEtapaDto) {
        return this.etapaService.create(data);
    }

    @Get()
    getAll() {
        return this.etapaService.getAll();
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.etapaService.getById(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: CreateEtapaDto) {
        return this.etapaService.update(id, data);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.etapaService.delete(id);
    }
}
