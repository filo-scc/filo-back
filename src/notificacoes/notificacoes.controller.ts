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
    create(@Req() req: any, @Body() data: CreateNotificacaoDto) {
        return this.notificacoesService.create(data, req.user.fabrico_id);
    }

    @Get()
    findAll(@Req() req: any) {
        return this.notificacoesService.findAll(req.user.fabrico_id);
    }

    @Get("me")
    findMine(@Req() req: any) {
        return this.notificacoesService.findMine(req.user.id, req.user.fabrico_id);
    }

    @Get(":id")
    findOne(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
        return this.notificacoesService.findOne(id, req.user.fabrico_id);
    }

    @Patch(":id/lida")
    marcarComoLida(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
        return this.notificacoesService.marcarComoLida(id, req.user.id, req.user.fabrico_id);
    }

    @Put(":id")
    update(
        @Req() req: any,
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateNotificacaoDto,
    ) {
        return this.notificacoesService.update(id, data, req.user.fabrico_id);
    }

    @Delete(":id")
    remove(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
        return this.notificacoesService.remove(id, req.user.fabrico_id);
    }
}
