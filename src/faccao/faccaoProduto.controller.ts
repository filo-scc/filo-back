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
import { ParceiroProdutoService } from "./faccaoProduto.service";
import { CreateParceiroProdutoDto } from "./dto/create-faccaoproduto.dto";
import { UpdateParceiroProdutoDto } from "./dto/update-faccaoproduto.dto";

@Controller("faccoes-produtos")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FaccaoProdutoController {
    constructor(private readonly ParceiroProdutoService: ParceiroProdutoService) {}

    @Roles("PROPRIETARIO", "ADMIN")
    @Post(":Parceiro_id/:produto_id")
    createParceiroProduto(
        @Param("Parceiro_id", ParseIntPipe) idParceiro: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body() data: CreateParceiroProdutoDto,
    ) {
        return this.ParceiroProdutoService.createParceiroProduto(idParceiro, idProduto, data);
    }

    @Roles("PROPRIETARIO", "ADMIN")
    @Delete(":Parceiro_id/:produto_id")
    deleteParceiroProduto(
        @Param("Parceiro_id", ParseIntPipe) idParceiro: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
    ) {
        return this.ParceiroProdutoService.deleteParceiroProduto(idParceiro, idProduto);
    }

    @Get("/Parceiro/:Parceiro_id")
    getProdutosByParceiro(@Param("Parceiro_id", ParseIntPipe) idParceiro: number) {
        return this.ParceiroProdutoService.getProdutosByParceiro(idParceiro);
    }

    @Get("produto/:produto_id")
    getParceiroByProduto(@Param("produto_id", ParseIntPipe) idProduto: number) {
        return this.ParceiroProdutoService.getParceiroByProduto(idProduto);
    }

    @Roles("PROPRIETARIO", "ADMIN")
    @Put(":Parceiro_id/:produto_id")
    updateParceiroProduto(
        @Param("Parceiro_id", ParseIntPipe) idParceiro: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body() data: UpdateParceiroProdutoDto,
    ) {
        return this.ParceiroProdutoService.updateParceiroProduto(idParceiro, idProduto, data);
    }
}
