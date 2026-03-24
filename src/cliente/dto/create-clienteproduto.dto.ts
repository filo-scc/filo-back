import { IsOptional, IsString, IsNumber, Min } from "class-validator";

export class CreateClienteProdutoDto {
    @IsString()
    nome_para_cliente: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    preco_padrao?: number;
}
