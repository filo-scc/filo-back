import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    Put,
    Delete,
    ParseIntPipe,
    UseGuards,
} from "@nestjs/common";
import { FabricoService } from "./fabrico.service";
import { CreateFabricoDto } from "./dto/create-fabrico.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";

@Controller("fabricos")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class FabricoController {
    constructor(private readonly fabricoService: FabricoService) {}

    @Post()
    create(@Body() data: CreateFabricoDto) {
        return this.fabricoService.create(data);
    }

    @Get()
    getAll() {
        return this.fabricoService.getAll();
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.fabricoService.getById(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: CreateFabricoDto) {
        return this.fabricoService.update(id, data);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.fabricoService.delete(id);
    }
}
