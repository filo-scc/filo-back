import { IsBoolean, IsOptional, IsInt, IsString, IsDateString } from 'class-validator';

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
}