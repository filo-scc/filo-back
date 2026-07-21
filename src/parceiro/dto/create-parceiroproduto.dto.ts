import { IsNumber, IsPositive } from "class-validator";

export class CreateParceiroProdutoDto {
    @IsNumber()
    @IsPositive()
    preco: number;
}
