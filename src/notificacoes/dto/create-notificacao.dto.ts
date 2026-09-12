import { Type } from "class-transformer";
import {
    ArrayUnique,
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { CategoriaNotificacao, FonteNotificacao, SeveridadeNotificacao } from "@prisma/client";

export class CreateNotificacaoDto {
    @Type(() => Number)
    @IsInt()
    fabrico_id: number;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    tipo: string;

    @IsEnum(CategoriaNotificacao)
    categoria: CategoriaNotificacao;

    @IsEnum(SeveridadeNotificacao)
    severidade: SeveridadeNotificacao;

    @IsEnum(FonteNotificacao)
    fonte: FonteNotificacao;

    @IsString()
    @IsNotEmpty()
    titulo: string;

    @IsString()
    @IsNotEmpty()
    mensagem: string;

    @IsOptional()
    @IsObject()
    metadados?: Record<string, unknown>;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    entidade_tipo?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    entidade_id?: number;

    @IsOptional()
    @IsString()
    acao_url?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    chave_deduplicacao?: string;

    @IsOptional()
    @IsDateString()
    ocorreu_em?: string;

    @IsOptional()
    @IsDateString()
    expira_em?: string;

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @Type(() => Number)
    @IsInt({ each: true })
    destinatario_ids?: number[];
}
