import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export enum ProductionSeriesPeriod {
    WEEKLY = "semanal",
    MONTHLY = "mensal",
    QUARTERLY = "trimestral",
    YEARLY = "anual",
}

export class ProductionSeriesQueryDto {
    @IsOptional()
    @IsEnum(ProductionSeriesPeriod)
    periodo: ProductionSeriesPeriod = ProductionSeriesPeriod.WEEKLY;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(24)
    quantidade: number = 7;
}
