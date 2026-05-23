import { PartialType } from "@nestjs/mapped-types";
import { CreateParceiroProdutoDto } from "./create-faccaoproduto.dto";

export class UpdateParceiroProdutoDto extends PartialType(CreateParceiroProdutoDto) {}
