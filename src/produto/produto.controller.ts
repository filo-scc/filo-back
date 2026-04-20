import { Body, Controller, Post, Get, Param, ParseIntPipe, Delete, Put } from "@nestjs/common";
import { ProdutoService } from "./produto.service";
import { CreateProdutoDto } from "./dto/create-produto.dto";
import { UpdateProduto } from "./dto/update-produto.dto";

@Controller("produtos")
export class ProdutoController {
    constructor(private service: ProdutoService) {}

    @Post()
    create(@Body() data: CreateProdutoDto) {
        return this.service.create(data);
    }

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get("/fabrico/:fabrico_id")
    findAllFabrico(@Param("fabrico_id", ParseIntPipe) fabrico_id: number) {
        return this.service.findAllFabrico(fabrico_id);
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.service.delete(id);
    }

    @Put(":id")
    async update(@Param("id", ParseIntPipe) id: number, @Body() dadosAtualizados: UpdateProduto) {
        return await this.service.update(id, dadosAtualizados);
    }

    @Get("/cliente/:cliente_id/produtos-nao-associados/:fabrico_id")
    getUnassociatedProductsForClient(@Param("cliente_id", ParseIntPipe) cliente_id: number, @Param("fabrico_id", ParseIntPipe) fabrico_id: number) {
        return this.service.getUnassociatedProductsForClient(cliente_id, fabrico_id);
    }
}
