import { Type } from "class-transformer";

import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateAviamentoDto {
    @IsString()
    @IsNotEmpty()
    nome: string;

    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    fabrico_id: number;
}
