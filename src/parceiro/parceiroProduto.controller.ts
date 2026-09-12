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
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ParceiroProdutoService } from "./parceiroProduto.service";
import { CreateParceiroProdutoDto } from "./dto/create-parceiroproduto.dto";
import { UpdateParceiroProdutoDto } from "./dto/update-parceiroproduto.dto";

@Controller("parceiros-produtos")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParceiroProdutoController {
    constructor(private readonly parceiroProdutoService: ParceiroProdutoService) {}

    @Roles("PROPRIETARIO", "GERENTE")
    @Post(":Parceiro_id/:produto_id")
    createParceiroProduto(
        @Param("Parceiro_id", ParseIntPipe) idParceiro: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body() data: CreateParceiroProdutoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.parceiroProdutoService.createParceiroProduto(idParceiro, idProduto, data, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Delete(":Parceiro_id/:produto_id")
    deleteParceiroProduto(
        @Param("Parceiro_id", ParseIntPipe) idParceiro: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.parceiroProdutoService.deleteParceiroProduto(idParceiro, idProduto, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("/Parceiro/:Parceiro_id")
    getProdutosByParceiro(
        @Param("Parceiro_id", ParseIntPipe) idParceiro: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.parceiroProdutoService.getProdutosByParceiro(idParceiro, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("produto/:produto_id")
    getParceiroByProduto(
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.parceiroProdutoService.getParceiroByProduto(idProduto, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Put(":Parceiro_id/:produto_id")
    updateParceiroProduto(
        @Param("Parceiro_id", ParseIntPipe) idParceiro: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body() data: UpdateParceiroProdutoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.parceiroProdutoService.updateParceiroProduto(idParceiro, idProduto, data, user);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get(":parceiro_id/:produto_id")
    findOne(
        @Param("parceiro_id", ParseIntPipe) idParceiro: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.parceiroProdutoService.getParceiroProduto(idProduto, idParceiro, user);
    }
}
