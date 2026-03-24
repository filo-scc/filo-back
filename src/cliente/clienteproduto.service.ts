import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateClienteProdutoDto } from "./dto/create-clienteproduto.dto";
import { UpdateClienteProdutoDto } from "./dto/update-clienteproduto.dto";

@Injectable()
export class ClienteProdutoService {
    constructor(private prisma: PrismaService) {}

    async updateClienteProduto(
        cliente_id: number,
        produto_id: number,
        data: UpdateClienteProdutoDto,
    ) {
        try {
            if (data.preco_padrao !== undefined && data.preco_padrao < 0) {
                throw new BadRequestException("O preço não pode ser negativo.");
            }

            return await this.prisma.$transaction(async (tx) => {
                const cliente = await tx.cliente.findUnique({ where: { id: cliente_id } });
                if (!cliente) throw new NotFoundException("Cliente não encontrado");

                const produto = await tx.produto.findUnique({ where: { id: produto_id } });
                if (!produto) throw new NotFoundException("Produto não encontrado");

                return tx.clienteProduto.update({
                    where: { produto_id_cliente_id: { cliente_id, produto_id } },
                    data: {
                        nome_para_cliente: data.nome_para_cliente,
                        preco_padrao: data.preco_padrao,
                    },
                });
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2025") {
                    throw new NotFoundException("Relação cliente-produto não encontrada.");
                }
            }
            throw error;
        }
    }

    async vincularClienteProduto(
        cliente_id: number,
        produto_id: number,
        data: CreateClienteProdutoDto,
    ) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const produto = await tx.produto.findUnique({
                    where: { id: produto_id },
                });

                if (!produto) {
                    throw new NotFoundException("Esse produto não existe");
                }

                const cliente = await tx.cliente.findUnique({
                    where: { id: cliente_id },
                });

                if (!cliente) {
                    throw new NotFoundException("Esse cliente não existe");
                }

                if (cliente.fabrico_id !== produto.fabrico_id) {
                    throw new BadRequestException(
                        "Cliente e produto não pertencem ao mesmo fabrico",
                    );
                }

                const jaExiste = await tx.clienteProduto.findFirst({
                    where: {
                        cliente_id,
                        produto_id: produto_id,
                    },
                });

                if (jaExiste) {
                    throw new BadRequestException("Esse produto já está vinculado a esse cliente");
                }

                return tx.clienteProduto.create({
                    data: {
                        cliente_id,
                        produto_id,
                        ...data,
                    },
                });
            });
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getAllProdutoByCliente(cliente_id: number) {
        try {
            return this.prisma.clienteProduto.findMany({
                where: {
                    cliente_id: cliente_id,
                },
                select: {
                    nome_para_cliente: true,
                    preco_padrao: true,
                    produto: {
                        select: {
                            foto: true,
                            nome: true,
                            tipo: true,
                        },
                    },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new ConflictException("Erro ao buscar produtos");
            }
            throw error;
        }
    }

    async getAllClienteByProduto(product_id: number) {
        try {
            return this.prisma.clienteProduto.findMany({
                where: {
                    produto_id: product_id,
                },
                select: {
                    nome_para_cliente: true,
                    preco_padrao: true,
                    cliente: {
                        select: {
                            nome: true,
                            cnpj: true,
                            telefone: true,
                            responsavel: true,
                            status: true,
                        },
                    },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new ConflictException("Erro ao buscar clientes");
            }
            throw error;
        }
    }
    async removeClienteProduto(cliente_id: number, product_id: number) {
        try {
            return await this.prisma.clienteProduto.delete({
                where: {
                    produto_id_cliente_id: {
                        produto_id: product_id,
                        cliente_id: cliente_id,
                    },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2025") {
                    throw new NotFoundException("Este vínculo não existe ou já foi removido.");
                }
            }
            throw error;
        }
    }
}
