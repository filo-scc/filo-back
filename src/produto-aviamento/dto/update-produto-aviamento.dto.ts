import { IsNumber, IsOptional, Min } from "class-validator";

export class UpdateProdutoAviamentoDto {
    @IsOptional()
    @IsNumber()
    @Min(0)
    quantidade?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    custo?: number;
}
