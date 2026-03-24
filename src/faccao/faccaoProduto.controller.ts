import {
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    ParseIntPipe,
    UseGuards,
    Controller,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { FaccaoProdutoService } from "./faccaoProduto.service";

@Controller("faccaoProduto")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FaccaoProdutoController {
    constructor(private readonly faccaoProdutoService: FaccaoProdutoService) {}

    @Roles("DONO", "ADMIN")
    @Post(":faccao_id/produtos/:produto_id")
    linkProdutos(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body("preco") preco: number,
    ) {
        return this.faccaoProdutoService.linkProdutos(idFaccao, idProduto, preco);
    }

    @Roles("DONO", "ADMIN")
    @Delete(":faccao_id/produto/:produto_id")
    desvProdutos(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
    ) {
        return this.faccaoProdutoService.desvProdutos(idFaccao, idProduto);
    }

    @Get(":faccao_id/produtos")
    getProdutosByFaccao(@Param("faccao_id", ParseIntPipe) idFaccao: number) {
        return this.faccaoProdutoService.getProdutosByFaccao(idFaccao);
    }

    @Get("produtos/:produto_id")
    getFaccaoByProduto(@Param("produto_id", ParseIntPipe) idProduto: number) {
        return this.faccaoProdutoService.getFaccaoByProduto(idProduto);
    }

    @Roles("DONO", "ADMIN")
    @Put(":faccao_id/produtos/:produto_id")
    updateFaccaoProduto(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body("preco") novoPreco: number,
    ) {
        return this.faccaoProdutoService.updateFaccaoProduto(novoPreco, idFaccao, idProduto);
    }
}
