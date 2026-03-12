import { IsBoolean, IsOptional, IsString, Length } from "class-validator";
export class CreateFabricoDto {
    @IsOptional()
    @IsString()
    foto_de_perfil?: string;

    @IsOptional()
    @IsString()
    @Length(14, 14)
    cnpj?: string;

    @IsOptional()
    @IsString()
    razao_social?: string;

    @IsOptional()
    @IsString()
    nome_fantasia?: string;

    @IsOptional()
    @IsBoolean()
    ativo?: boolean;
}
