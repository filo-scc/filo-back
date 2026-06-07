import { IsBoolean, IsOptional, IsInt, IsString, IsDateString, IsNumber } from "class-validator";

export class CreatePedidoDto {
    @IsBoolean()
    finalizado: boolean;

    @IsOptional()
    @IsDateString()
    data_prevista?: string;

    @IsOptional()
    @IsString()
    observacoes?: string;

    @IsOptional()
    @IsInt()
    cliente_id?: number;

    @IsInt()
    fabrico_id: number;

    @IsOptional()
    @IsInt()
    numero?: number;

    @IsString()
    cor: string;

    @IsInt()
    quantidade: number;

    @IsOptional()
    @IsNumber()
    valor_total?: number;
}
