import { IsBoolean, IsOptional, IsString, IsUrl, Length } from "class-validator";
export class CreateIconeDto {
    @IsUrl()
    @IsString()
    link: string;
}
