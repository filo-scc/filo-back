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
    Req,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LoginDto } from "./dto/login-dto";
// import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { CreateUserDto } from "./dto/create-user-dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";

@Controller("usuarios")
export class AuthController {
    constructor(private authService: AuthService) {}

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("DONO", "ADMIN")
    @Post()
    create(@Body() data: CreateUserDto) {
        return this.authService.create(data);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("DONO", "ADMIN")
    @Get("/fabrico/:fabrico_id")
    getAllByFabricoId(@Param("fabrico_id", ParseIntPipe) fabrico_id: number) {
        return this.authService.getAllByFabricoId(fabrico_id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("DONO", "ADMIN")
    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.authService.getById(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("DONO", "ADMIN")
    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateUserDto) {
        return this.authService.update(id, data);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("DONO", "ADMIN")
    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.authService.delete(id);
    }

    @Post("/login")
    login(@Body() data: LoginDto) {
        return this.authService.login(data);
    }

    @UseGuards(JwtRefreshGuard)
    @Post("/refresh")
    refresh(@Req() req: any) {
        return this.authService.refresh(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post("/logout")
    logout(@Req() req: any) {
        return this.authService.logout(req.user.id);
    }
}
