import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { TipoProduto } from "@prisma/client";

export class UpdateProduto{
    @IsOptional()
    @IsString()
    foto?: string;

    @IsOptional()
    @IsString()
    nome?: string;

    @IsEnum(TipoProduto)
    @IsOptional()
    tipo?: TipoProduto;
}