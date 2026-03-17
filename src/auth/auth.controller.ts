import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "./dto/create-user-dto";
import { UpdateUserDto } from "./dto/update-user-dto";

@Controller("usuarios")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post()
    create(@Body() data: CreateUserDto) {
        return this.authService.create(data);
    }

    @Get("/fabrico/:fabrico_id")
    getAllByFabricoId(@Param("fabrico_id", ParseIntPipe) fabrico_id: number) {
        return this.authService.getAllByFabricoId(fabrico_id);
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.authService.getById(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() data: UpdateUserDto) {
        return this.authService.update(id, data);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.authService.delete(id);
    }
}
