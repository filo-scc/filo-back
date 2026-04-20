import { IsOptional, IsString, IsUrl } from "class-validator";
export class CreateIconeDto {
    @IsOptional()
    @IsUrl()
    @IsString()
    link?: string;
}
