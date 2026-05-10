import { Type } from "class-transformer";
import { IsArray, ArrayNotEmpty, IsInt } from "class-validator";

export class AddCoresBatchDto {
    @IsArray()
    @ArrayNotEmpty()
    @Type(() => Number)
    @IsInt({ each: true })
    cores_ids: number[];
}
