import { IsOptional, IsString, IsNumber } from "class-validator";
export class CreateEnderecoDto {
    @IsOptional()
    @IsString()
    rua: string;

    @IsOptional()
    @IsString()
    numero: string;
    
    @IsOptional()
    @IsString()
    bairro: string;

    @IsOptional()
    @IsString()
    complemento?: string;
    
    @IsOptional()
    @IsString()
    cidade: string;
    
    @IsOptional()
    @IsString()
    estado: string;
    
    @IsOptional()
    @IsNumber()
    usuario_id: number;
    
    @IsOptional()
    @IsNumber()
    faccao_id: number;
}

