import { Body, Controller, Post, Get, UseGuards } from "@nestjs/common";
import { TipoProdutoService } from "./tipo-produto.service";
import { CreateTipoProdutoDto } from "./dto/create-tipo-produto.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("tipo-produto")
export class TipoProdutoController {
    constructor(private readonly tipoProdutoService: TipoProdutoService) {}

    @Post()
    create(@Body() data: CreateTipoProdutoDto, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.tipoProdutoService.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: BusinessAuthenticatedUser) {
        return this.tipoProdutoService.findAllByFabrico(user.fabrico_id, user);
    }
}
