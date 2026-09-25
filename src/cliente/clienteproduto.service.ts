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
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@Injectable()
export class ClienteProdutoService {
    constructor(private prisma: PrismaService) {}

    private async assertClienteDoFabrico(
        tx: Prisma.TransactionClient | PrismaService,
        cliente_id: number,
        fabricoId: number,
    ) {
        const cliente = await tx.cliente.findFirst({
            where: { id: cliente_id, fabrico_id: fabricoId },
        });

        if (!cliente) {
            throw new NotFoundException("Cliente não encontrado");
        }

        return cliente;
    }

    private async assertProdutoDoFabrico(
        tx: Prisma.TransactionClient | PrismaService,
        produto_id: number,
        fabricoId: number,
        exigirAtivo = true,
    ) {
        const produto = await tx.produto.findFirst({
            where: {
                id: produto_id,
                fabrico_id: fabricoId,
                ...(exigirAtivo ? { ativo: true } : {}),
            },
        });

        if (!produto) {
            throw new NotFoundException("Produto não encontrado");
        }

        return produto;
    }

    async updateClienteProduto(
        cliente_id: number,
        produto_id: number,
        data: UpdateClienteProdutoDto,
        user: BusinessAuthenticatedUser,
    ) {
        const fabricoId = user.fabrico_id;

        try {
            if (data.preco_padrao !== undefined && data.preco_padrao < 0) {
                throw new BadRequestException("O preço não pode ser negativo.");
            }

            return await this.prisma.$transaction(async (tx) => {
                await this.assertClienteDoFabrico(tx, cliente_id, fabricoId);
                await this.assertProdutoDoFabrico(tx, produto_id, fabricoId);

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
        user: BusinessAuthenticatedUser,
    ) {
        const fabricoId = user.fabrico_id;

        if (data.preco_padrao !== undefined && data.preco_padrao < 0) {
            throw new BadRequestException("O preço não pode ser negativo.");
        }

        return this.prisma.$transaction(async (tx) => {
            await this.assertProdutoDoFabrico(tx, produto_id, fabricoId);
            await this.assertClienteDoFabrico(tx, cliente_id, fabricoId);

            const jaExiste = await tx.clienteProduto.findFirst({
                where: {
                    cliente_id,
                    produto_id,
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
    }

    async getAllProdutoByCliente(cliente_id: number, user: BusinessAuthenticatedUser) {
        const fabricoId = user.fabrico_id;

        try {
            await this.assertClienteDoFabrico(this.prisma, cliente_id, fabricoId);

            return await this.prisma.clienteProduto.findMany({
                where: {
                    cliente_id,
                    cliente: { fabrico_id: fabricoId },
                    produto: { fabrico_id: fabricoId },
                },
                select: {
                    nome_para_cliente: true,
                    preco_padrao: true,
                    produto: {
                        select: {
                            id: true,
                            foto: true,
                            nome: true,
                            tipo_produto: {
                                select: {
                                    id: true,
                                    nome: true,
                                },
                            },
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

    async getAllClienteByProduto(produto_id: number, user: BusinessAuthenticatedUser) {
        const fabricoId = user.fabrico_id;

        try {
            await this.assertProdutoDoFabrico(this.prisma, produto_id, fabricoId, false);

            return await this.prisma.clienteProduto.findMany({
                where: {
                    produto_id,
                    cliente: { fabrico_id: fabricoId },
                    produto: { fabrico_id: fabricoId },
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

    async removeClienteProduto(
        cliente_id: number,
        produto_id: number,
        user: BusinessAuthenticatedUser,
    ) {
        const fabricoId = user.fabrico_id;

        try {
            await this.assertClienteDoFabrico(this.prisma, cliente_id, fabricoId);
            await this.assertProdutoDoFabrico(this.prisma, produto_id, fabricoId);

            return await this.prisma.clienteProduto.delete({
                where: {
                    produto_id_cliente_id: {
                        produto_id,
                        cliente_id,
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
