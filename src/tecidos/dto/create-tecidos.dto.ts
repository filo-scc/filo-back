import { IsNumber, IsString } from "class-validator";

export class CreateTecidosDto {
    @IsString()
    nome: string;

    @IsNumber()
    fabrico_id: number;
}
