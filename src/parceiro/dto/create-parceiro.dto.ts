import { IsString, IsOptional, ValidateNested, Length, IsEnum, IsInt, Min } from "class-validator";

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

    /** Etapa do parceiro. Na atualização, `null` remove o vínculo e omitir o campo o mantém. */
    @IsOptional()
    @IsInt()
    @Min(1)
    etapa_id?: number | null;

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
    @ValidateNested()
    @Type(() => CreateEnderecoDto)
    endereco?: CreateEnderecoDto;
}
