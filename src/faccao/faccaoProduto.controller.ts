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
import { CreateFaccaoProdutoDto } from "./dto/create-faccaoproduto.dto";
import { UpdateFaccaoProdutoDto } from "./dto/update-faccaoproduto.dto";

@Controller("faccoes-produtos")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FaccaoProdutoController {
    constructor(private readonly faccaoProdutoService: FaccaoProdutoService) {}

    @Roles("PROPRIETARIO", "ADMIN")
    @Post(":faccao_id/:produto_id")
    createFaccaoProduto(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body() data: CreateFaccaoProdutoDto,
    ) {
        return this.faccaoProdutoService.createFaccaoProduto(idFaccao, idProduto, data);
    }

    @Roles("PROPRIETARIO", "ADMIN")
    @Delete(":faccao_id/:produto_id")
    deleteFaccaoProduto(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
    ) {
        return this.faccaoProdutoService.deleteFaccaoProduto(idFaccao, idProduto);
    }

    @Get("/faccao/:faccao_id")
    getProdutosByFaccao(@Param("faccao_id", ParseIntPipe) idFaccao: number) {
        return this.faccaoProdutoService.getProdutosByFaccao(idFaccao);
    }

    @Get("produto/:produto_id")
    getFaccaoByProduto(@Param("produto_id", ParseIntPipe) idProduto: number) {
        return this.faccaoProdutoService.getFaccaoByProduto(idProduto);
    }

    @Roles("PROPRIETARIO", "ADMIN")
    @Put(":faccao_id/:produto_id")
    updateFaccaoProduto(
        @Param("faccao_id", ParseIntPipe) idFaccao: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body() data: UpdateFaccaoProdutoDto,
    ) {
        return this.faccaoProdutoService.updateFaccaoProduto(idFaccao, idProduto, data);
    }
}
