import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
    ValidateNested,
    ArrayMinSize,
} from "class-validator";
import { CreateGradeItemDto } from "./create-grade-item.dto";

export class CreateGradeDto {
    @IsString()
    nome: string;

    @IsOptional()
    @IsBoolean()
    ativo?: boolean;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateGradeItemDto)
    itens: CreateGradeItemDto[];
}
