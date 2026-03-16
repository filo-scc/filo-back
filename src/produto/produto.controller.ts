import { Body, Controller, Post, Get, Param, ParseIntPipe, Delete, Patch} from "@nestjs/common"
import { ProdutoService } from "./produto.service"
import { CreateProdutoDto } from "./dto/create-produto.dto"
import { UpdateProduto } from "./dto/update-produto.dto";

@Controller("produto")
export class ProdutoController {
    constructor (private service: ProdutoService) {}

    @Post()
    create(@Body() data: CreateProdutoDto){
        return this.service.cadastrar(data);
    }

    @Get()
    buscarTodos(){
        return this.service.buscar_todos();
    }

    @Get(":id")
    buscar_Id(@Param("id", ParseIntPipe) id: number){
        return this.service.buscar_id(id)
    }

    @Delete(":id")
    deletar(@Param("id", ParseIntPipe) id: number){
        return this.service.deletar(id)
    }

    @Patch(':id')
    async atualizar(@Param('id', ParseIntPipe) id: number, @Body() dadosAtualizados: UpdateProduto){
        return await this.service.atualizar(id, dadosAtualizados);
    }
}