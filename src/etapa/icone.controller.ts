import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    Put,
    Delete,
    UseGuards,
    ParseIntPipe,
} from "@nestjs/common";
import { IconeService } from "./icone.service";
import { CreateIconeDto } from "../etapa/dto/create-icone.dto";
import { UpdateIconeDto } from "./dto/update-icone.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("icones")
export class IconeController {
    constructor(private readonly iconeService: IconeService) {}

    @Roles("ADMIN")
    @Post()
    create(@Body() data: CreateIconeDto) {
        return this.iconeService.create(data);
    }

    @Get()
    getAll() {
        return this.iconeService.getAll();
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.iconeService.getById(id);
    }

    @Roles("ADMIN")
    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateIconeDto) {
        return this.iconeService.update(id, data);
    }

    @Roles("ADMIN")
    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.iconeService.delete(id);
    }
}
