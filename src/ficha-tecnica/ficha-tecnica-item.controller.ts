import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    UseGuards,
    ParseIntPipe,
    Req,
} from "@nestjs/common";
import { FichaTecnicaItemService } from "./ficha-tecnica-item.service";
import { UpdateFichaTecnicaItemDto } from "./dto/update-ficha-tecnica-item.dto";
import { ReplaceFichaTecnicaItensDto } from "./dto/replace-ficha-tecnica-itens.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { CreateFichaTecnicaCorDto } from "./dto/create-ficha-tecnica-cor.dto";
import { AddCoresBatchDto } from "./dto/add-cores-batch.dto";
import { RemoveCoresBatchDto } from "./dto/remove-cores-batch.dto";
import { SyncCoresBatchDto } from "./dto/sync-cores-batch.dto";
import { CreateFichaTecnicaItemDto } from "./dto/create-ficha-tecnica-item.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "PROPRIETARIO", "GERENTE")
@Controller("fichas-tecnicas")
export class FichaTecnicaItemController {
    constructor(private readonly fichaTecnicaItemService: FichaTecnicaItemService) {}

    @Get(":ficha_tecnica_id/itens")
    findAllByFichaTecnicaID(
        @Param("ficha_tecnica_id", ParseIntPipe) ficha_tecnica_id: number,
        @Req() req: Request,
    ) {
        return this.fichaTecnicaItemService.findAllByFichaTecnicaID(
            ficha_tecnica_id,
            (req as any).user.fabrico_id,
        );
    }

    @Post(":ficha_tecnica_id/itens")
    createManyByFichaTecnicaID(
        @Param("ficha_tecnica_id", ParseIntPipe) ficha_tecnica_id: number,
        @Body() data: ReplaceFichaTecnicaItensDto,
        @Req() req: Request,
    ) {
        return this.fichaTecnicaItemService.createManyByFichaTecnicaID(
            ficha_tecnica_id,
            data.itens,
            (req as any).user.fabrico_id,
        );
    }

    @Post("item/:ficha_tecnica_id")
    create(
        @Param("ficha_tecnica_id", ParseIntPipe) ficha_tecnica_id: number,
        @Body() data: CreateFichaTecnicaItemDto,
        @Req() req: Request,
    ) {
        return this.fichaTecnicaItemService.create(
            ficha_tecnica_id,
            data,
            (req as any).user.fabrico_id,
        );
    }

    @Put("itens/:id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateFichaTecnicaItemDto,
        @Req() req: Request,
    ) {
        return this.fichaTecnicaItemService.update(id, data, (req as any).user.fabrico_id);
    }

    @Delete("itens/:id")
    remove(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
        return this.fichaTecnicaItemService.remove(id, (req as any).user.fabrico_id);
    }

    @Delete(":ficha_tecnica_id/itens")
    clearByFichaTecnicaID(
        @Param("ficha_tecnica_id", ParseIntPipe) ficha_tecnica_id: number,
        @Req() req: Request,
    ) {
        return this.fichaTecnicaItemService.clearByFichaTecnicaID(
            ficha_tecnica_id,
            (req as any).user.fabrico_id,
        );
    }

    @Post(":ficha_tecnica_id/cores")
    gerarItensPorCor(
        @Param("ficha_tecnica_id", ParseIntPipe) ficha_tecnica_id: number,
        @Body() data: CreateFichaTecnicaCorDto,
        @Req() req: Request,
    ) {
        return this.fichaTecnicaItemService.gerarItensPorCor(
            ficha_tecnica_id,
            data.cor_id,
            (req as any).user.fabrico_id,
        );
    }

    @Post(":ficha_tecnica_id/cores/batch")
    gerarItensPorCoresBatch(
        @Param("ficha_tecnica_id", ParseIntPipe)
        ficha_tecnica_id: number,
        @Body() dto: AddCoresBatchDto,
        @Req() req: Request,
    ) {
        return this.fichaTecnicaItemService.gerarItensPorCoresBatch(
            ficha_tecnica_id,
            dto.cores_ids,
            (req as any).user.fabrico_id,
        );
    }

    @Delete(":ficha_tecnica_id/cores")
    removerCoresBatch(
        @Param("ficha_tecnica_id", ParseIntPipe)
        ficha_tecnica_id: number,
        @Body() dto: RemoveCoresBatchDto,
        @Req() req: Request,
    ) {
        return this.fichaTecnicaItemService.removerCoresBatch(
            ficha_tecnica_id,
            dto.cores_ids,
            (req as any).user.fabrico_id,
        );
    }

    @Post(":ficha_tecnica_id/cores/sync")
    syncCoresBatch(
        @Param("ficha_tecnica_id", ParseIntPipe) ficha_tecnica_id: number,
        @Body() dto: SyncCoresBatchDto,
        @Req() req: Request,
    ) {
        return this.fichaTecnicaItemService.syncCoresBatch(
            ficha_tecnica_id,
            dto.cores_ids,
            (req as any).user.fabrico_id,
        );
    }
}
