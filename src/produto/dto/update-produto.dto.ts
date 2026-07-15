import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateProduto {
    @IsOptional()
    @IsString()
    foto?: string;

    @IsOptional()
    @IsString()
    nome?: string;

    @IsOptional()
    @IsNumber()
    tipo_produto_id: number;

    @IsOptional()
    @IsNumber()
    grade_versao_id?: number;

    @IsOptional()
    @IsNumber()
    tecido_id?: number;
}
