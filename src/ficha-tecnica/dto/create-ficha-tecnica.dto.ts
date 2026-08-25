import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateFichaTecnicaDto {
    @IsInt()
    produto_id: number;

    @IsOptional()
    @IsInt()
    etapa_atual_id?: number;

    @IsOptional()
    @IsString()
    observacoes?: string;

    @IsBoolean()
    concluida: boolean;

    @IsInt()
    pedido_id: number;

    @IsInt()
    quantidade: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    defeitos_costura: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    defeitos_tecido: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    retiradas: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    sobras: number;
}
