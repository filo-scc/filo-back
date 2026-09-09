import { Body, Controller, Get, NotFoundException, Post, UseGuards } from "@nestjs/common";
import { TipoProdutoService } from "./tipo-produto.service";
import { CreateTipoProdutoDto } from "./dto/create-tipo-produto.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("tipo-produto")
export class TipoProdutoController {
    constructor(private readonly tipoProdutoService: TipoProdutoService) {}

    private getFabricoId(user: AuthenticatedUser): number {
        if (!user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return user.fabrico_id;
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Post()
    create(
        @Body() createTipoProdutoDto: CreateTipoProdutoDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.tipoProdutoService.create(createTipoProdutoDto, this.getFabricoId(user));
    }

    @Roles("PROPRIETARIO", "GERENTE")
    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.tipoProdutoService.findAllByFabrico(this.getFabricoId(user));
    }
}
