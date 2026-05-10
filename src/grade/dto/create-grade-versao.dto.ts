import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { CreateGradeVersaoItemDto } from "./create-grade-versao-item.dto";

export class CreateGradeVersaoDto {
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateGradeVersaoItemDto)
    itens?: CreateGradeVersaoItemDto[];

    @IsOptional()
    @IsArray()
    @Type(() => Number)
    adicionar_tamanho_ids?: number[];

    @IsOptional()
    @IsArray()
    @Type(() => Number)
    remover_tamanho_ids?: number[];
}
