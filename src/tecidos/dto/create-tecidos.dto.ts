import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { UnidadeDeMedida } from "@prisma/client";

export class CreateTecidosDto {
    @IsString()
    nome: string;

    @IsNumber()
    custo_unitario: number;

    @IsEnum(UnidadeDeMedida)
    unidade_de_medida: UnidadeDeMedida;

    @IsOptional()
    @IsNumber()
    fabrico_id?: number;
}
