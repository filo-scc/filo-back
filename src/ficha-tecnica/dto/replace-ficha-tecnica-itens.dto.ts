import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { CreateFichaTecnicaItemDto } from "./create-ficha-tecnica-item.dto";

export class ReplaceFichaTecnicaItensDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateFichaTecnicaItemDto)
    itens: CreateFichaTecnicaItemDto[];
}
