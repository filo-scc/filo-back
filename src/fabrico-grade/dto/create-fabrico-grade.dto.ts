import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional } from "class-validator";

export class CreateFabricoGradeDto {
    @Type(() => Number)
    @IsNumber()
    fabrico_id: number;

    @Type(() => Number)
    @IsNumber()
    grade_id: number;

    @IsOptional()
    @IsBoolean()
    ativo?: boolean;
}
