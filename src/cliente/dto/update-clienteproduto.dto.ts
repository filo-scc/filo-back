import { OmitType, PartialType } from "@nestjs/mapped-types";
import { CreateClienteProdutoDto } from "./create-clienteproduto.dto";

// Pegue o CreateDto, remova o 'produto_id' e torne o resto opcional.
export class UpdateClienteProdutoDto extends PartialType(
  OmitType(CreateClienteProdutoDto, ['produto_id'] as const),
) {}