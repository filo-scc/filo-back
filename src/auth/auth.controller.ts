import {
    Controller,
    Post,
    Body,
    UseGuards,
    ParseIntPipe,
    Get,
    Param,
    Put,
    Delete,
    Query,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LoginDto } from "./dto/login-dto";
import { CreateUserDto } from "./dto/create-user-dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "./types/authenticated-user";
import { ListUsersByFabricoQueryDto } from "./dto/list-users-by-fabrico-query.dto";

@Controller("usuarios")
export class AuthController {
    constructor(private authService: AuthService) {}

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("PROPRIETARIO", "ADMIN")
    @Post()
    create(@Body() data: CreateUserDto) {
        return this.authService.create(data);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("PROPRIETARIO", "ADMIN")
    @Get("/fabrico")
    getAllByFabricoId(
        @CurrentUser() user: AuthenticatedUser,
        @Query() query: ListUsersByFabricoQueryDto,
    ) {
        return this.authService.getAllByFabricoId(user, query.fabrico_id);
    }

    @UseGuards(JwtAuthGuard)
    @Get("/me")
    getMe(@CurrentUser() user: AuthenticatedUser) {
        return this.authService.getById(user.id, user);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("PROPRIETARIO", "ADMIN")
    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() data: UpdateUserDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.authService.update(id, data, user);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("PROPRIETARIO", "ADMIN")
    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.authService.delete(id, user);
    }

    @Post("/login")
    login(@Body() data: LoginDto) {
        return this.authService.login(data);
    }

    @UseGuards(JwtRefreshGuard)
    @Post("/refresh")
    refresh(@CurrentUser() user: AuthenticatedUser) {
        return this.authService.refresh(user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post("/logout")
    logout(@CurrentUser() user: AuthenticatedUser) {
        return this.authService.logout(user.id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("PROPRIETARIO", "ADMIN")
    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
        return this.authService.getById(id, user);
    }
}
