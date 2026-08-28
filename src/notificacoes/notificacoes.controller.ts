import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
    UseGuards,
} from "@nestjs/common";
import { NotificacoesService } from "./notificacoes.service";
import { CreateNotificacaoDto } from "./dto/create-notificacao.dto";
import { UpdateNotificacaoDto } from "./dto/update-notificacao.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PROPRIETARIO", "GERENTE")
@Controller("notificacoes")
export class NotificacoesController {
    constructor(private readonly notificacoesService: NotificacoesService) {}

    @Post()
    create(@Body() data: CreateNotificacaoDto) {
        return this.notificacoesService.create(data);
    }

    @Get()
    findAll() {
        return this.notificacoesService.findAll();
    }

    @Get("me")
    findMine(@Req() req: any) {
        return this.notificacoesService.findMine(req.user.id);
    }

    @Get("fabrico/:fabrico_id")
    findAllByFabricoID(@Param("fabrico_id", ParseIntPipe) fabrico_id: number) {
        return this.notificacoesService.findAllByFabricoID(fabrico_id);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.notificacoesService.findOne(id);
    }

    @Patch(":id/lida")
    marcarComoLida(@Param("id", ParseIntPipe) id: number, @Req() req: any) {
        return this.notificacoesService.marcarComoLida(id, req.user.id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateNotificacaoDto) {
        return this.notificacoesService.update(id, data);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.notificacoesService.remove(id);
    }
}
