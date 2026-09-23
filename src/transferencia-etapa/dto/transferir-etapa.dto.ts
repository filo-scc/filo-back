import { Type } from "class-transformer";
import {
    IsArray,
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Min,
    ValidateNested,
} from "class-validator";

class ParceiroTransferenciaDto {
    @IsInt()
    parceiro_id: number;

    @IsOptional()
    @IsString()
    operacao?: string;

    @IsNumber()
    @IsPositive()
    preco: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    quantidade?: number;
}

class RelatorioAcabamentoDto {
    @IsInt()
    @Min(0)
    quantidade: number;

    @IsInt()
    @Min(0)
    defeitos_costura: number;

    @IsInt()
    @Min(0)
    defeitos_tecido: number;

    @IsInt()
    @Min(0)
    retiradas: number;

    @IsInt()
    @Min(0)
    sobras: number;
}

export class TransferirEtapaDto {
    @IsInt()
    ficha_tecnica_id: number;

    @IsInt()
    etapa_origem_id: number;

    @IsInt()
    etapa_destino_id: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => RelatorioAcabamentoDto)
    relatorio?: RelatorioAcabamentoDto;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ParceiroTransferenciaDto)
    parceiros?: ParceiroTransferenciaDto[];
}
