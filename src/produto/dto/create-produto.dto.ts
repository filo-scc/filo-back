import {IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString} from "class-validator";
import { TipoProduto } from "@prisma/client";

export class CreateProdutoDto{
    @IsString()
    @IsOptional()
    foto?: string;

    @IsString()
    @IsNotEmpty()
    nome: string;

    @IsEnum(TipoProduto)
    @IsNotEmpty()
    tipo: TipoProduto;

    @IsNumber()
    @IsNotEmpty()
    fabrico_id: number;
}