import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";
export class CreateEtapaDto {
  @IsInt()
  fabrico_id: number;

  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsInt()
  @Min(0)
  ordem: number;

  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}