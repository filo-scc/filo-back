import { Type } from "class-transformer";
import {
    ArrayMinSize,
    IsArray,
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
    @IsDateString()
    data_prevista?: string | null;

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
