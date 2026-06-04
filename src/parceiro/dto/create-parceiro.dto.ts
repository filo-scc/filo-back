import {
    IsString,
    IsInt,
    IsOptional,
    IsArray,
    ValidateNested,
    IsNumber,
    Length,
    Min,
    IsEnum,
} from "class-validator";

class ProdutoLinkDto {
    @IsInt()
    produto_id: number;

    @Min(0, { message: "O preço não pode ser menor que 0" })
    @IsNumber()
    preco: number;
}

export enum FormaPagamentoEnum {
    PIX = "PIX",
    TED = "TED",
}

import { Type } from "class-transformer";
import { CreateEnderecoDto } from "src/endereco/dto/create-endereco.dto";
export class CreateParceiroDto {
    @IsString()
    nome: string;

    @IsOptional()
    @IsString()
    responsavel?: string;

    @IsOptional()
    @IsString()
    @Length(9, 11)
    telefone?: string;

    @IsNumber()
    fabrico_id: number;

    @IsOptional()
    @IsEnum(FormaPagamentoEnum, {
        message: "A forma de pagamento deve ser: PIX ou TED",
    })
    forma_pagamento?: FormaPagamentoEnum;

    @IsOptional()
    @IsString()
    chave_pix?: string;

    @IsOptional()
    @IsString()
    banco?: string;

    @IsOptional()
    @IsString()
    agencia?: string;

    @IsOptional()
    @IsString()
    conta?: string;

    @IsOptional()
    @IsString()
    categoria?: string;

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
