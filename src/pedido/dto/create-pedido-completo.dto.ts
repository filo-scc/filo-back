import { Type } from "class-transformer";
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsDateString,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from "class-validator";

export class CreatePedidoFichaItemDto {
    @IsInt()
    cor_id: number;

    @IsInt()
    grade_versao_item_id: number;

    @IsInt()
    @Min(0)
    quantidade: number;
}

export class CreatePedidoFichaParceiroDto {
    @IsInt()
    parceiro_id: number;

    @IsOptional()
    @IsString()
    operacao?: string | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    preco?: number | null;
}

export class CreatePedidoFichaDto {
    @IsInt()
    produto_id: number;

    @IsOptional()
    @IsInt()
    grade_versao_id?: number;

    @IsOptional()
    @IsInt()
    etapa_atual_id?: number;

    @IsInt()
    @Min(0)
    quantidade: number;

    @IsOptional()
    @IsString()
    observacoes?: string;

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    cores_ids?: number[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePedidoFichaItemDto)
    itens?: CreatePedidoFichaItemDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePedidoFichaParceiroDto)
    parceiros?: CreatePedidoFichaParceiroDto[];

    // Usados apenas quando o pedido possui cliente (produção sob demanda)
    @IsOptional()
    @IsString()
    nome_para_cliente?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    preco_padrao?: number | null;
}

export class CreatePedidoCompletoDto {
    @IsOptional()
    @IsBoolean()
    finalizado?: boolean;

    @IsOptional()
    @IsDateString()
    data_prevista?: string;

    @IsOptional()
    @IsString()
    observacoes?: string;

    @IsOptional()
    @IsInt()
    cliente_id?: number | null;

    @IsOptional()
    @IsBoolean()
    usarCorPaleta?: boolean;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreatePedidoFichaDto)
    fichas: CreatePedidoFichaDto[];
}
