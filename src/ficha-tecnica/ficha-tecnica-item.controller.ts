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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "PROPRIETARIO", "GERENTE")
@Controller("fichas-tecnicas")
export class FichaTecnicaItemController {
    constructor(private readonly fichaTecnicaItemService: FichaTecnicaItemService) {}

    @Get(":ficha_tecnica_id/itens")
    findAllByFichaTecnicaID(@Param("ficha_tecnica_id", ParseIntPipe) ficha_tecnica_id: number) {
        return this.fichaTecnicaItemService.findAllByFichaTecnicaID(ficha_tecnica_id);
    }

    @Post(":ficha_tecnica_id/itens")
    createManyByFichaTecnicaID(
        @Param("ficha_tecnica_id", ParseIntPipe) ficha_tecnica_id: number,
        @Body() data: ReplaceFichaTecnicaItensDto,
    ) {
        return this.fichaTecnicaItemService.createManyByFichaTecnicaID(
            ficha_tecnica_id,
            data.itens,
        );
    }

    @Put("itens/:id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateFichaTecnicaItemDto) {
        return this.fichaTecnicaItemService.update(id, data);
    }

    @Delete("itens/:id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.fichaTecnicaItemService.remove(id);
    }

    @Delete(":ficha_tecnica_id/itens")
    clearByFichaTecnicaID(@Param("ficha_tecnica_id", ParseIntPipe) ficha_tecnica_id: number) {
        return this.fichaTecnicaItemService.clearByFichaTecnicaID(ficha_tecnica_id);
    }

    @Post(":ficha_tecnica_id/cores")
    gerarItensPorCor(
        @Param("ficha_tecnica_id", ParseIntPipe) ficha_tecnica_id: number,
        @Body() data: CreateFichaTecnicaCorDto,
    ) {
        return this.fichaTecnicaItemService.gerarItensPorCor(ficha_tecnica_id, data.cor_id);
    }

    @Post(":ficha_tecnica_id/cores/batch")
    gerarItensPorCoresBatch(
        @Param("ficha_tecnica_id", ParseIntPipe)
        ficha_tecnica_id: number,
        @Body() dto: AddCoresBatchDto,
    ) {
        return this.fichaTecnicaItemService.gerarItensPorCoresBatch(
            ficha_tecnica_id,
            dto.cores_ids,
        );
    }

    @Delete(":ficha_tecnica_id/cores")
    removerCoresBatch(
        @Param("ficha_tecnica_id", ParseIntPipe)
        ficha_tecnica_id: number,
        @Body() dto: RemoveCoresBatchDto,
    ) {
        return this.fichaTecnicaItemService.removerCoresBatch(ficha_tecnica_id, dto.cores_ids);
    }

    @Post(":ficha_tecnica_id/cores/sync")
    syncCoresBatch(
        @Param("ficha_tecnica_id", ParseIntPipe) ficha_tecnica_id: number,
        @Body() dto: SyncCoresBatchDto,
    ) {
        return this.fichaTecnicaItemService.syncCoresBatch(ficha_tecnica_id, dto.cores_ids);
    }
}
