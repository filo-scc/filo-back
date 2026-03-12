import { Controller, Post, Body, Get, Param, Put, Delete } from "@nestjs/common";
import { FabricoService } from "./fabrico.service";
import { CreateFabricoDto } from "./dto/create-fabrico.dto";

@Controller("fabricos")
export class FabricoController {
    constructor(private readonly fabricoService: FabricoService) {}

    @Post()
    create(@Body() data: CreateFabricoDto) {
        return this.fabricoService.create(data);
    }

    @Get()
    getAll() {
        return this.fabricoService.getAll();
    }

    @Get(":id")
    getById(@Param("id") id: number) {
        return this.fabricoService.getById(id);
    }

    @Put(":id")
    update(@Param("id") id: number, @Body() data: CreateFabricoDto) {
        return this.fabricoService.update(id, data);
    }

    @Delete(":id")
    delete(@Param("id") id: number) {
        return this.fabricoService.delete(id);
    }
}
