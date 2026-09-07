import {
    Body,
    Controller,
    Post,
    Get,
    Param,
    ParseIntPipe,
    Delete,
    Put,
    UseGuards,
} from "@nestjs/common";
import { ProdutoService } from "./produto.service";
import { CreateProdutoDto } from "./dto/create-produto.dto";
import { UpdateProduto } from "./dto/update-produto.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@Controller("produtos")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
export class ProdutoController {
    constructor(private service: ProdutoService) {}

    @Post()
    create(@Body() data: CreateProdutoDto, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.service.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: BusinessAuthenticatedUser) {
        return this.service.findAll(user);
    }

    @Get("/fabrico/:fabrico_id")
    findAllFabrico(
        @Param("fabrico_id", ParseIntPipe) fabrico_id: number,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.service.findAllFabrico(fabrico_id, user);
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.service.getById(id, user);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.service.delete(id, user);
    }

    @Put(":id")
    async update(
        @Param("id", ParseIntPipe) id: number,
        @Body() dadosAtualizados: UpdateProduto,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return await this.service.update(id, dadosAtualizados, user);
    }

    @Get("/cliente/:cliente_id/produtos-nao-associados/:fabrico_id")
    getUnassociatedProductsForClient(
        @Param("cliente_id", ParseIntPipe) cliente_id: number,
        @Param("fabrico_id", ParseIntPipe) fabrico_id: number,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.service.getUnassociatedProductsForClient(cliente_id, fabrico_id, user);
    }
}
