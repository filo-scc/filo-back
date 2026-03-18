import { Controller, Get, Post, Body, Param, Delete, Put } from "@nestjs/common";
import { FaccaoService } from "./faccao.service";
import { CreateFaccaoDto } from "./dto/create-faccao.dto";
import { UpdateFaccaoDto } from "./dto/update-faccao.dto";

@Controller("faccoes")
export class FaccaoController {
    constructor(private readonly faccaoService: FaccaoService) {}

    @Post()
    create(@Body() data: CreateFaccaoDto) {
        return this.faccaoService.create(data);
    }

    @Get("fabrico/:id")
    findAllFaccaoByFabrico(@Param("id") id: string) {
        return this.faccaoService.getAllFaccaoByFabrico(Number(id));
    }

    @Get()
    findAll() {
        return this.faccaoService.getAll();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.faccaoService.getById(+id);
    }

    @Put(":id")
    update(@Param("id") id: string, @Body() data: UpdateFaccaoDto) {
        // Caso queira alterar qualquer info que não seja o nome remover o nome do body
        return this.faccaoService.update(+id, data);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.faccaoService.delete(+id);
    }
}
