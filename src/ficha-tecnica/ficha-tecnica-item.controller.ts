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
import { CreateFichaTecnicaItemDto } from "./dto/create-ficha-tecnica-item.dto";
import { UpdateFichaTecnicaItemDto } from "./dto/update-ficha-tecnica-item.dto";
import { ReplaceFichaTecnicaItensDto } from "./dto/replace-ficha-tecnica-itens.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";

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
}
