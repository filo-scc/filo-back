import { PartialType } from "@nestjs/mapped-types";
import { CreateParceiroDto } from "./create-faccao.dto";

export class UpdateParceiroDto extends PartialType(CreateParceiroDto) {}
