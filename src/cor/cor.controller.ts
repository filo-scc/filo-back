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
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "PROPRIETARIO", "GERENTE")
@Controller("cores")
export class CorController {
    constructor(private readonly corService: CorService) {}

    @Post()
    create(@Body() data: CreateCorDto, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.corService.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: BusinessAuthenticatedUser) {
        return this.corService.findAll(user);
    }

    @Get("fabrico/:fabrico_id")
    findAllByFabricoID(
        @Param("fabrico_id", ParseIntPipe) fabrico_id: number,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.corService.findAllByFabricoID(fabrico_id, user);
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.corService.findOne(id, user);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateCorDto,
        @CurrentUser() user: BusinessAuthenticatedUser,
    ) {
        return this.corService.update(id, data, user);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: BusinessAuthenticatedUser) {
        return this.corService.remove(id, user);
    }
}
