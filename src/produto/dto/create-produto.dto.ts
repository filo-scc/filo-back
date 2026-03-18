import {IsNotEmpty, IsNumber, IsOptional, IsString} from "class-validator";

export class CreateProdutoDto{
    @IsString()
    @IsOptional()
    foto?: string;

    @IsString()
    @IsNotEmpty()
    nome: string;

    @IsString()
    @IsNotEmpty()
    tipo: string;

    @IsNumber()
    @IsNotEmpty()
    fabrico_id: number;
}