import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class CreateGradeVersaoItemDto {
    @Type(() => Number)
    @IsInt()
    tamanho_id: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    posicao: number;
}
