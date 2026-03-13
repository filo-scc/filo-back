import { IsBoolean, IsOptional, IsString, Length, IsNumber } from 'class-validator';

export class CreateClienteDto {

  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  @Length(14, 14)
  cnpj?: string;

  @IsOptional()
  @IsString()
  @Length(11, 11)
  telefone?: string;

  @IsBoolean()
  status: boolean;

  @IsOptional()
  @IsString()
  responsavel?: string;

}