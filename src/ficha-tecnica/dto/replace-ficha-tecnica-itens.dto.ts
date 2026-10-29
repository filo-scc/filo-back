import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, Min, ValidateIf, ValidateNested } from "class-validator";
import { CreateFichaTecnicaItemDto } from "./create-ficha-tecnica-item.dto";
import { applyDecorators } from "@nestjs/common";

const PerdaOpcional = () =>
    applyDecorators(
        ValidateIf((_, valor) => valor !== undefined),
        IsInt(),
        Min(0),
    );

export class ReplaceFichaTecnicaItensDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateFichaTecnicaItemDto)
    itens: CreateFichaTecnicaItemDto[];

    @PerdaOpcional() defeitos_costura?: number;
    @PerdaOpcional() defeitos_tecido?: number;
    @PerdaOpcional() retiradas?: number;
    @PerdaOpcional() sobras?: number;
}
