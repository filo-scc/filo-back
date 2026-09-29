import { OmitType, PartialType } from "@nestjs/mapped-types";
import { CreateProdutoDto } from "./create-produto.dto";

export class UpdateProduto extends PartialType(
    OmitType(CreateProdutoDto, ["fabrico_id"] as const),
) {}
