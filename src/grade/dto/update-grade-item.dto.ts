import { PartialType } from "@nestjs/mapped-types";
import { CreateGradeItemDto } from "./create-grade-item.dto";

export class UpdateGradeItemDto extends PartialType(CreateGradeItemDto) {}
