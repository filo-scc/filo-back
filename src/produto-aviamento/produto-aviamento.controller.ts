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
} from "@nestjs/common";
import { ProdutoAviamentoService } from "./produto-aviamento.service";
import { CreateProdutoAviamentoDto } from "./dto/create-produto-aviamento.dto";
import { UpdateProdutoAviamentoDto } from "./dto/update-produto-aviamento.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("produto-aviamento")
export class ProdutoAviamentoController {
    constructor(private readonly produtoAviamentoService: ProdutoAviamentoService) {}

    @Post()
    create(
        @Body() createProdutoAviamentoDto: CreateProdutoAviamentoDto,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.produtoAviamentoService.create(createProdutoAviamentoDto, user);
    }

    @Get()
    findAll(@CurrentUser() user: BusinessAuthenticatedUser) {
        return this.produtoAviamentoService.findAll(user);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.produtoAviamentoService.findOne(id, user);
    }

    @Get("/produto/:id")
    findAllByProduto(
        @Param("id", ParseIntPipe) id: number,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.produtoAviamentoService.findAllByProduto(id, user);
    }

    @Get("/aviamento/:id")
    findAllByAviamento(
        @Param("id", ParseIntPipe) id: number,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.produtoAviamentoService.findAllByAviamento(id, user);
    }

    @Patch(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() updateProdutoAviamentoDto: UpdateProdutoAviamentoDto,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.produtoAviamentoService.update(id, updateProdutoAviamentoDto, user);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.produtoAviamentoService.remove(id, user);
    }
}
