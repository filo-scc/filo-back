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
    Query,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { FaccaoProdutoService } from "./faccaoProduto.service";
import { CreateFaccaoProdutoDto } from "./dto/create-faccaoproduto.dto";
import { UpdateFaccaoProdutoDto } from "./dto/update-faccaoproduto.dto";

@Controller("faccoes-produtos")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FaccaoProdutoController {
    constructor(private readonly faccaoProdutoService: FaccaoProdutoService) {}

    @Roles("DONO", "ADMIN")
    @Post(":faccao_id/:produto_id")
    linkProdutos(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body() data: CreateFaccaoProdutoDto,
    ) {
        return this.faccaoProdutoService.linkProdutos(idFaccao, idProduto, data);
    }

    @Roles("DONO", "ADMIN")
    @Delete(":faccao_id/:produto_id")
    desvProdutos(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
    ) {
        return this.faccaoProdutoService.unlinkProduto(idFaccao, idProduto);
    }

    @Get("/faccao/:faccao_id")
    getProdutosByFaccao(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Query("skip") skip?: string,
        @Query("take") take?: string,
    ) {
        return this.faccaoProdutoService.getProdutosByFaccao(
            idFaccao,
            skip ? Number(skip) : 0,
            take ? Number(take) : 10,
        );
    }

    @Get("produto/:produto_id")
    getFaccaoByProduto(
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Query("skip") skip?: string,
        @Query("take") take?: string,
    ) {
        return this.faccaoProdutoService.getFaccaoByProduto(
            idProduto,
            skip ? Number(skip) : 0,
            take ? Number(take) : 10,
        );
    }

    @Roles("DONO", "ADMIN")
    @Put(":faccao_id/produtos/:produto_id")
    updateFaccaoProduto(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body() data: UpdateFaccaoProdutoDto,
    ) {
        return this.faccaoProdutoService.updateFaccaoProduto(idFaccao, idProduto, data);
    }
}
