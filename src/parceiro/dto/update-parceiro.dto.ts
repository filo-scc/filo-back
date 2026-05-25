import { PartialType } from "@nestjs/mapped-types";
import { CreateParceiroDto } from "./create-parceiro.dto";

export class UpdateParceiroDto extends PartialType(CreateParceiroDto) {}
