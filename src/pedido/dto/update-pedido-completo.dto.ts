import { Type } from "class-transformer";
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsDateString,
    IsInt,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { CreatePedidoFichaDto } from "./create-pedido-completo.dto";

export class UpdatePedidoFichaDto extends CreatePedidoFichaDto {
    @IsOptional()
    @IsInt()
    id?: number;
}

export class UpdatePedidoCompletoDto {
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

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => UpdatePedidoFichaDto)
    fichas: UpdatePedidoFichaDto[];
}
