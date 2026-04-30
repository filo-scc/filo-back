import { PartialType } from "@nestjs/mapped-types";
import { CreateFabricoGradeDto } from "./create-fabrico-grade.dto";

export class UpdateFabricoGradeDto extends PartialType(CreateFabricoGradeDto) {}
