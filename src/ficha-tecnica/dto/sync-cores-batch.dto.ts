import { Type } from "class-transformer";
import { IsArray, IsInt } from "class-validator";

export class SyncCoresBatchDto {
    @IsArray()
    @Type(() => Number)
    @IsInt({ each: true })
    cores_ids: number[];
}
