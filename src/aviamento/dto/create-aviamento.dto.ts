import { Type } from "class-transformer";
import { UnidadeDeMedida } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateAviamentoDto {
    @IsString()
    @IsNotEmpty()
    nome: string;

    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    fabrico_id: number;

    @IsEnum(UnidadeDeMedida)
    @IsNotEmpty()
    unidade_de_medida: UnidadeDeMedida;

    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    custo_unitario: number;
}
