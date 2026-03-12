import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateClienteDto {

  @IsOptional()
  @IsString()
  nome?: string;

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