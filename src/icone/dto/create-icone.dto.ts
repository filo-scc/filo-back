import { IsBoolean, IsOptional, IsString, Length } from "class-validator";
export class CreateIconeDto {
    @IsString()
    link: string;
}
