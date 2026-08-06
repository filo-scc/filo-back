import {
    Controller,
    Post,
    Body,
    Get,
    ParseIntPipe,
    Param,
    Delete,
    Put,
    UseGuards,
    Req,
} from "@nestjs/common";
import { PedidoService } from "./pedido.service";
import { CreatePedidoDto } from "./dto/create-pedido.dto";
import { UpdatePedidoDto } from "./dto/update-pedido.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("pedidos")
export class PedidoController {
    constructor(private readonly pedidoService: PedidoService) {}

    @Post()
    async create(@Body() createPedidoDto: CreatePedidoDto, @Req() req: Request) {
        return this.pedidoService.create(createPedidoDto, (req as any).user.fabrico_id);
    }

    @Get()
    findAll() {
        return this.pedidoService.findAll();
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.pedidoService.getById(id);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.pedidoService.delete(id);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdatePedidoDto,
        @Req() req: Request,
    ) {
        return this.pedidoService.update(id, data, (req as any).user.fabrico_id);
    }

    @Get("/fabrico/:fabrico_id")
    findAllFabrico(@Param("fabrico_id", ParseIntPipe) fabrico_id: number) {
        return this.pedidoService.findAllFabrico(fabrico_id);
    }

    @Get("/cliente/:cliente_id")
    findAllCliente(@Param("cliente_id", ParseIntPipe) cliente_id: number) {
        return this.pedidoService.findAllCliente(cliente_id);
    }
}
