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
    Req,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ParceiroProdutoService } from "./parceiroProduto.service";
import { CreateParceiroProdutoDto } from "./dto/create-parceiroproduto.dto";
import { UpdateParceiroProdutoDto } from "./dto/update-parceiroproduto.dto";

@Controller("parceiros-produtos")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParceiroProdutoController {
    constructor(private readonly ParceiroProdutoService: ParceiroProdutoService) {}

    @Roles("PROPRIETARIO", "GERENTE")
    @Post(":Parceiro_id/:produto_id")
    createParceiroProduto(
        @Req() req: any,
        @Param("Parceiro_id", ParseIntPipe) idParceiro: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body() data: CreateParceiroProdutoDto,
    ) {
        return this.ParceiroProdutoService.createParceiroProduto(
            idParceiro,
            idProduto,
            data,
            req.user.fabrico_id,
        );
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Delete(":Parceiro_id/:produto_id")
    deleteParceiroProduto(
        @Req() req: any,
        @Param("Parceiro_id", ParseIntPipe) idParceiro: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
    ) {
        return this.ParceiroProdutoService.deleteParceiroProduto(
            idParceiro,
            idProduto,
            req.user.fabrico_id,
        );
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("/Parceiro/:Parceiro_id")
    getProdutosByParceiro(
        @Req() req: any,
        @Param("Parceiro_id", ParseIntPipe) idParceiro: number,
    ) {
        return this.ParceiroProdutoService.getProdutosByParceiro(
            idParceiro,
            req.user.fabrico_id,
        );
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("produto/:produto_id")
    getParceiroByProduto(@Req() req: any, @Param("produto_id", ParseIntPipe) idProduto: number) {
        return this.ParceiroProdutoService.getParceiroByProduto(idProduto, req.user.fabrico_id);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Put(":Parceiro_id/:produto_id")
    updateParceiroProduto(
        @Req() req: any,
        @Param("Parceiro_id", ParseIntPipe) idParceiro: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
        @Body() data: UpdateParceiroProdutoDto,
    ) {
        return this.ParceiroProdutoService.updateParceiroProduto(
            idParceiro,
            idProduto,
            data,
            req.user.fabrico_id,
        );
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get(":parceiro_id/:produto_id")
    findOne(
        @Req() req: any,
        @Param("parceiro_id", ParseIntPipe) idParceiro: number,
        @Param("produto_id", ParseIntPipe) idProduto: number,
    ) {
        return this.ParceiroProdutoService.getParceiroProduto(
            idProduto,
            idParceiro,
            req.user.fabrico_id,
        );
    }
}
