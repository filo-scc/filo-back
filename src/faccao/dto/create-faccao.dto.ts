import {
    IsString,
    IsInt,
    IsOptional,
    IsArray,
    ValidateNested,
    IsNumber,
    Length,
} from "class-validator";

class ProdutoLinkDto {
    @IsInt()
    produto_id: number;

    @IsNumber()
    preco: number;
}

import { Type } from "class-transformer";
import { CreateEnderecoDto } from "src/endereco/dto/create-endereco.dto";
export class CreateFaccaoDto {
    @IsString()
    nome: string;

    @IsOptional()
    @IsString()
    @Length(9, 11)
    telefone?: string;

    @IsNumber()
    fabrico_id: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProdutoLinkDto)
    produtos?: ProdutoLinkDto[];

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateEnderecoDto)
    endereco?: CreateEnderecoDto;
}
