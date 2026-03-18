import { IsOptional, IsString } from "class-validator";

export class UpdateProduto {
    @IsOptional()
    @IsString()
    foto?: string;

    @IsOptional()
    @IsString()
    nome?: string;

    @IsString()
    @IsOptional()
    tipo?: string;
}
