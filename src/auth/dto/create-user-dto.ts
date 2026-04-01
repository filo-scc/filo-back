import { IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Cargo, Prisma } from "@prisma/client";
import { CreateEnderecoDto } from "src/endereco/dto/create-endereco.dto";
import { Type } from "class-transformer";

export class CreateUserDto {
    @IsString()
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

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateEnderecoDto)
    endereco?: CreateEnderecoDto;
}
