import { Type } from "class-transformer";
import { IsInt, IsString, Min } from "class-validator";

export class CreateTamanhoDto {
    @IsString()
    codigo: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    ordem_global: number;
}
