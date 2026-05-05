import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class CreateFichaTecnicaItemDto {
    @Type(() => Number)
    @IsInt()
    cor_id: number;

    @Type(() => Number)
    @IsInt()
    grade_versao_item_id: number;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    quantidade: number;
}
