import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

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
    defeitos_costura: number;

    @IsOptional()
    @IsInt()
    defeitos_tecido: number;

    @IsOptional()
    @IsInt()
    retiradas: number;

    @IsOptional()
    @IsInt()
    sobras: number;
}
