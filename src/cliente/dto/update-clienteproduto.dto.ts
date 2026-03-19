import { PartialType } from "@nestjs/mapped-types";
import { CreateClienteProdutoDto } from "./create-clienteproduto.dto";

export class UpdateClienteProdutoDto extends PartialType(CreateClienteProdutoDto) {}
