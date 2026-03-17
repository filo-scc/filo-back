import { Prisma } from ".prisma/client/edge";
import { IsBoolean, IsNumber, IsOptional, IsString, Length } from "class-validator";

export class CreateClienteDto implements Prisma.ClienteUncheckedCreateInput {
    @IsString()
    nome: string;

    @IsOptional()
    @IsString()
    @Length(14, 14)
    cnpj?: string;

    @IsOptional()
    @IsString()
    @Length(9, 11)
    telefone?: string;

    @IsBoolean()
    status: boolean;

    @IsOptional()
    @IsString()
    responsavel?: string;

    @IsNumber()
    fabrico_id: number;
}
