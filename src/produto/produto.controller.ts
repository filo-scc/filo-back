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
    NotFoundException,
} from "@nestjs/common";
import { ProdutoService } from "./produto.service";
import { CreateProdutoDto } from "./dto/create-produto.dto";
import { UpdateProduto } from "./dto/update-produto.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("produtos")
export class ProdutoController {
    constructor(private readonly service: ProdutoService) {}

    private getFabricoId(user: AuthenticatedUser): number {
        if (!user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return user.fabrico_id;
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Post()
    create(@Body() data: CreateProdutoDto, @CurrentUser() user: AuthenticatedUser) {
        return this.service.create(data, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.service.findAll(this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("/fabrico/:fabrico_id")
    findAllFabrico(
        @Param("fabrico_id", ParseIntPipe) fabrico_id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const currentFabricoId = this.getFabricoId(user);

        if (fabrico_id !== currentFabricoId) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return this.service.findAllFabrico(currentFabricoId);
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.service.getById(id, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() dadosAtualizados: UpdateProduto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.update(id, dadosAtualizados, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.service.delete(id, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("/cliente/:cliente_id/produtos-nao-associados")
    getUnassociatedProductsForClient(
        @Param("cliente_id", ParseIntPipe) cliente_id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const currentFabricoId = this.getFabricoId(user);

        return this.service.getUnassociatedProductsForClient(cliente_id, currentFabricoId);
    }
}
