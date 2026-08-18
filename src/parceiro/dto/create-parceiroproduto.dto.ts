import { IsNumber, IsOptional, IsPositive } from "class-validator";

export class CreateParceiroProdutoDto {
    @IsOptional()
    @IsNumber()
    @IsPositive()
    preco?: number | null;
}
