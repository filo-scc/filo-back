import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    ParseIntPipe,
    UseGuards,
} from "@nestjs/common";
import { FaccaoService } from "./faccao.service";
import { CreateFaccaoDto } from "./dto/create-faccao.dto";
import { UpdateFaccaoDto } from "./dto/update-faccao.dto";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("faccoes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FaccaoController {
    constructor(private readonly faccaoService: FaccaoService) {}

    @Roles("DONO", "ADMIN")
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

    @Roles("DONO", "ADMIN")
    @Put(":id")
    update(@Param("id") id: string, @Body() data: UpdateFaccaoDto) {
        // Caso queira alterar qualquer info que não seja o nome remover o nome do body
        return this.faccaoService.update(+id, data);
    }

    @Roles("DONO", "ADMIN")
    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.faccaoService.delete(+id);
    }

    @Roles("DONO", "ADMIN")
    @Post(":faccao_id/produtos/:produto_id")
    linkProdutos(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body("preco") preco: number,
    ) {
        return this.faccaoService.linkProdutos(idFaccao, idProduto, preco);
    }

    @Roles("DONO", "ADMIN")
    @Delete(":faccao_id/produto/:produto_id")
    desvProdutos(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
    ) {
        return this.faccaoService.desvProdutos(idFaccao, idProduto);
    }

    @Get(":faccao_id/produtos")
    getProdutosByFaccao(@Param("faccao_id", ParseIntPipe) idFaccao: number) {
        return this.faccaoService.getProdutosByFaccao(idFaccao);
    }

    @Get("produtos/:produto_id")
    getFaccaoByProduto(@Param("produto_id", ParseIntPipe) idProduto: number) {
        return this.faccaoService.getFaccaoByProduto(idProduto);
    }

    @Roles("DONO", "ADMIN")
    @Put(":faccao_id/produtos/:produto_id")
    updateFaccaoProduto(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body("preco") novoPreco: number,
    ) {
        return this.faccaoService.updateFaccaoProduto(novoPreco, idFaccao, idProduto);
    }
}
