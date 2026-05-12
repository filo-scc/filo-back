import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateProduto {
    @IsOptional()
    @IsString()
    foto?: string;

    @IsOptional()
    @IsString()
    nome?: string;

    @IsOptional()
    @IsString()
    tipo?: string;

    @IsOptional()
    @IsNumber()
    grade_versao_id?: number;

    @IsNumber()
    @IsNotEmpty()
    tecido_id: number;
}
