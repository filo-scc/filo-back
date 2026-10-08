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
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

@Controller("fabricos")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FabricoController {
    constructor(private readonly fabricoService: FabricoService) {}

    @Roles("ADMIN")
    @Post()
    create(@Body() data: CreateFabricoDto) {
        return this.fabricoService.create(data);
    }

    @Roles("ADMIN")
    @Get()
    getAll() {
        return this.fabricoService.getAll();
    }

    @Roles("ADMIN", "PROPRIETARIO", "GERENTE")
    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.fabricoService.getByIdForUser(id, user);
    }

    @Roles("ADMIN")
    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: CreateFabricoDto) {
        return this.fabricoService.update(id, data);
    }

    @Roles("ADMIN")
    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.fabricoService.delete(id);
    }
}
