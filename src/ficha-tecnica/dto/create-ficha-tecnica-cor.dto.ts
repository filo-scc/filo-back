import { Type } from "class-transformer";
import { IsInt } from "class-validator";

export class CreateFichaTecnicaCorDto {
    @Type(() => Number)
    @IsInt()
    cor_id: number;
}
