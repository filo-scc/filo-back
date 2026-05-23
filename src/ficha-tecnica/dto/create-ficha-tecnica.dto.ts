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
    fabrico_id: number;
    pedido_id: number;
}
