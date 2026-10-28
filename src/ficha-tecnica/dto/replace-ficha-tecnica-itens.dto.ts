import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsOptional, Min, ValidateNested } from "class-validator";
import { CreateFichaTecnicaItemDto } from "./create-ficha-tecnica-item.dto";

export class ReplaceFichaTecnicaItensDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateFichaTecnicaItemDto)
    itens: CreateFichaTecnicaItemDto[];

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    defeitos_costura?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    defeitos_tecido?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    retiradas?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    sobras?: number;
}
