import { Body, Controller, Post, Get, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { TipoProdutoService } from "./tipo-produto.service";
import { CreateTipoProdutoDto } from "./dto/create-tipo-produto.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("tipo-produto")
export class TipoProdutoController {
    constructor(private readonly tipoProdutoService: TipoProdutoService) {}

    // @Post()
    // create(@Body() data: CreateTipoProdutoDto) {
    //     return this.tipoProdutoService.create(data);
    // }

    // @Get()
    // findAll() {
    //     return this.tipoProdutoService.findAll();
    // }

  
    @Post()
    create(
      @Body() data: CreateTipoProdutoDto,
      @Req() req: Request,
    ) {
      return this.tipoProdutoService.create(
        data,
        (req as any).user.fabrico_id,
      );
    }
  
    @Get()
    findAll(
      @Req() req: Request,
    ) {
      return this.tipoProdutoService.findAllByFabrico(
        (req as any).user.fabrico_id
      );
    }
  }