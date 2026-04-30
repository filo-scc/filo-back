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
import { CorService } from "./cor.service";
import { CreateCorDto } from "./dto/create-cor.dto";
import { UpdateCorDto } from "./dto/update-cor.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "PROPRIETARIO", "GERENTE")
@Controller("cores")
export class CorController {
    constructor(private readonly corService: CorService) {}

    @Post()
    create(@Body() data: CreateCorDto) {
        return this.corService.create(data);
    }

    @Get()
    findAll() {
        return this.corService.findAll();
    }

    @Get("fabrico/:fabrico_id")
    findAllByFabricoID(@Param("fabrico_id", ParseIntPipe) fabrico_id: number) {
        return this.corService.findAllByFabricoID(fabrico_id);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.corService.findOne(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateCorDto) {
        return this.corService.update(id, data);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.corService.remove(id);
    }
}
