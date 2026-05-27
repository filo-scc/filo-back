import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, MaxLength, IsEnum } from "class-validator";

export enum TipoCorEnum {
    COR = "COR",
    ESTAMPA = "ESTAMPA",
}

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

    @IsString()
    @IsOptional()
    foto?: string;

    @IsString()
    @IsEnum(TipoCorEnum, {
        message: "O tipo de cor deve ser: COR ou ESTAMPA",
    })
    tipo: TipoCorEnum;
}
