import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class UploadContextDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    fabrico_id?: number;
}
