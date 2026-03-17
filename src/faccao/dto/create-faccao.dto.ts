import { IsNumber, IsOptional, IsString, Length } from "class-validator";
export class CreateFaccaoDto {
    @IsString()
    nome: string;

    @IsOptional()
    @IsString()
    @Length(9, 11)
    telefone?: string;

    @IsNumber()
    fabrico_id: number;    
}
