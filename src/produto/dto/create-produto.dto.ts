import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateProdutoDto {
    @IsString()
    @IsOptional()
    foto?: string;

    @IsString()
    @IsNotEmpty()
    nome: string;

    @IsNumber()
    @IsNotEmpty()
    tipo_produto_id: number;

    @IsNumber()
    @IsNotEmpty()
    fabrico_id: number;

    @IsNumber()
    @IsOptional()
    grade_versao_id?: number;

    @IsNumber()
    @IsOptional()
    tecido_id?: number;
}
