import { Prisma } from ".prisma/client/edge";
import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, Length, Validate, ValidateNested } from "class-validator";
import { CreateEnderecoDto } from "src/endereco/dto/create-endereco.dto";

export class CreateClienteDto {
    @IsString()
    nome: string;

    @IsOptional()
    @IsString()
    @Length(14, 14)
    cnpj?: string;

    @IsOptional()
    @IsString()
    @Length(9, 11)
    telefone?: string;

    @IsBoolean()
    status: boolean;

    @IsOptional()
    @IsString()
    responsavel?: string;

    @IsNumber()
    fabrico_id: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateEnderecoDto)
    endereco?: CreateEnderecoDto;
}
