import { Allow, IsBoolean } from "class-validator";

export class UpdateFabricoGradeDto {
    @IsBoolean()
    ativo: boolean;

    // Mantidos no whitelist para que o service os recuse com 400 em vez de descartá-los em silêncio.
    @Allow()
    fabrico_id?: unknown;

    @Allow()
    grade_id?: unknown;
}
