import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Cargo, Prisma } from "@prisma/client";

export class CreateUserDto implements Prisma.UsuarioUncheckedCreateInput {
    @IsOptional()
    email: string;

    @IsString()
    nome: string;

    @IsString()
    senha: string;

    @IsOptional()
    @IsString()
    foto_de_perfil?: string;

    @IsEnum(Cargo)
    cargo: Cargo;

    @IsNumber()
    fabrico_id: number;

    @IsOptional()
    @IsString()
    refresh_token_hash?: string;
}
