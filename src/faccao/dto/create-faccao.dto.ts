import { IsOptional, IsString, Length } from "class-validator";
export class CreateFaccaoDto {

    @IsString()
    nome: string

    @IsOptional()
    @IsString()
    @Length(11, 11)
    telefone?: string
}
