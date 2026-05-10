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
import { TamanhoService } from "./tamanho.service";
import { CreateTamanhoDto } from "./dto/create-tamanho.dto";
import { UpdateTamanhoDto } from "./dto/update-tamanho.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "PROPRIETARIO", "GERENTE")
@Controller("tamanhos")
export class TamanhoController {
    constructor(private readonly tamanhoService: TamanhoService) {}

    @Roles("ADMIN")
    @Post()
    create(@Body() data: CreateTamanhoDto) {
        return this.tamanhoService.create(data);
    }

    @Get()
    findAll() {
        return this.tamanhoService.findAll();
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.tamanhoService.findOne(id);
    }

    @Roles("ADMIN")
    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateTamanhoDto) {
        return this.tamanhoService.update(id, data);
    }

    @Roles("ADMIN")
    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.tamanhoService.remove(id);
    }
}
