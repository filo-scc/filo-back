import { IsDateString, IsInt, IsOptional, IsString } from "class-validator";

export class CreateFichaEtapaDto {
    
    @IsOptional()
    @IsDateString()
    data_inicio?: string;

    @IsOptional()
    @IsDateString()
    data_fim?: string;

    @IsOptional()
    @IsString()
    observacoes?: string;

    @IsInt()
    ficha_tecnica_id: number;

    @IsInt()
    etapa_id: number;
}