import { IsInt, IsNotEmpty, IsNumber, IsOptional, Min } from "class-validator";

export class CreateProdutoAviamentoDto {
    @IsNotEmpty()
    @IsInt()
    produto_id: number;

    @IsNotEmpty()
    @IsInt()
    aviamento_id: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    quantidade: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    custo: number;
}
