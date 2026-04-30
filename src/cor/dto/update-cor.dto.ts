import { PartialType } from "@nestjs/mapped-types";
import { CreateCorDto } from "./create-cor.dto";

export class UpdateCorDto extends PartialType(CreateCorDto) {}
