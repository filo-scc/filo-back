import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class ListUsersByFabricoQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    fabrico_id?: number;
}
