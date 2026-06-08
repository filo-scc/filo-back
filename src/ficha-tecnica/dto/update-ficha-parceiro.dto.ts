import { CreateFichaParceiroDto } from "./create-ficha-parceiro.dto";
import { PartialType } from "@nestjs/mapped-types";

export class UpdateFichaParceiroDto extends PartialType(CreateFichaParceiroDto) {}
