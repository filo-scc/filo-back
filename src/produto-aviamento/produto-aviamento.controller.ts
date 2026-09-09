import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    UseGuards,
    NotFoundException,
} from "@nestjs/common";
import { ProdutoAviamentoService } from "./produto-aviamento.service";
import { CreateProdutoAviamentoDto } from "./dto/create-produto-aviamento.dto";
import { UpdateProdutoAviamentoDto } from "./dto/update-produto-aviamento.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("produto-aviamento")
export class ProdutoAviamentoController {
    constructor(private readonly produtoAviamentoService: ProdutoAviamentoService) {}

    private getFabricoId(user: AuthenticatedUser): number {
        if (!user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return user.fabrico_id;
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Post()
    create(
        @Body() createProdutoAviamentoDto: CreateProdutoAviamentoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.produtoAviamentoService.create(
            createProdutoAviamentoDto,
            this.getFabricoId(user),
        );
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.produtoAviamentoService.findAll(this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.produtoAviamentoService.findOne(id, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("/produto/:id")
    findAllByProduto(
        @Param("id", ParseIntPipe) id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.produtoAviamentoService.findAllByProduto(id, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get("/aviamento/:id")
    findAllByAviamento(
        @Param("id", ParseIntPipe) id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.produtoAviamentoService.findAllByAviamento(id, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Patch(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() updateProdutoAviamentoDto: UpdateProdutoAviamentoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.produtoAviamentoService.update(
            id,
            updateProdutoAviamentoDto,
            this.getFabricoId(user),
        );
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.produtoAviamentoService.remove(id, this.getFabricoId(user));
    }
}
