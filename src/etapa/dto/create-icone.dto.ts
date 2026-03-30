import { IsBoolean, IsOptional, IsString, IsUrl, Length } from "class-validator";
export class CreateIconeDto {
    @IsOptional()
    @IsUrl()
    @IsString()
    link: string;
}
