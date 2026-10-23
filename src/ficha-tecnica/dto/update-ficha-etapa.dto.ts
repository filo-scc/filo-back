import { IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateFichaEtapaDto {
    @IsOptional()
    @IsDateString()
    data_inicio?: string;

    @IsOptional()
    @IsDateString()
    data_fim?: string;

    @IsOptional()
    @IsString()
    observacoes?: string;
}
