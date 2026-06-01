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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("produto-aviamento")
export class ProdutoAviamentoController {
    constructor(private readonly produtoAviamentoService: ProdutoAviamentoService) {}

    @Post()
    create(@Body() createProdutoAviamentoDto: CreateProdutoAviamentoDto) {
        return this.produtoAviamentoService.create(createProdutoAviamentoDto);
    }

    @Get()
    findAll() {
        return this.produtoAviamentoService.findAll();
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.produtoAviamentoService.findOne(id);
    }

    @Get("/produto/:id")
    findAllByProduto(@Param("id", ParseIntPipe) id: number) {
        return this.produtoAviamentoService.findAllByProduto(id);
    }

    @Get("/aviamento/:id")
    findAllByAviamento(@Param("id", ParseIntPipe) id: number) {
        return this.produtoAviamentoService.findAllByAviamento(id);
    }

    @Patch(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() updateProdutoAviamentoDto: UpdateProdutoAviamentoDto,
    ) {
        return this.produtoAviamentoService.update(id, updateProdutoAviamentoDto);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.produtoAviamentoService.remove(id);
    }
}
