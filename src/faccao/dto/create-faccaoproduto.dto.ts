import { IsNumber, IsPositive } from "class-validator";

export class CreateFaccaoProdutoDto {
    @IsNumber()
    @IsPositive()
    preco: number;
}
