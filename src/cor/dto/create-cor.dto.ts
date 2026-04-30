import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCorDto {
    @IsString()
    nome: string;

    @IsOptional()
    @IsString()
    @MaxLength(7)
    codigo_hex?: string;

    @Type(() => Number)
    @IsNumber()
    fabrico_id: number;
}
