import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateTipoProdutoDto {

    @IsString()
    @IsNotEmpty()
    nome: string;

}