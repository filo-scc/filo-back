import { IsInt, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateFichaParceiroDto {
    @IsOptional()
    @IsString()
    operacao?: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    valor?: number;

    @IsOptional()
    @IsInt()
    quantidade?: number;

    @IsInt()
    ficha_id: number;

    @IsInt()
    parceiro_id: number;
}
