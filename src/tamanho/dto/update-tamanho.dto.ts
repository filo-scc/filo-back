import { PartialType } from "@nestjs/mapped-types";
import { CreateTamanhoDto } from "./create-tamanho.dto";

export class UpdateTamanhoDto extends PartialType(CreateTamanhoDto) {}
