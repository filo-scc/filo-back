import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { UpdateClienteDto } from "./dto/update-cliente.dto";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CreateClienteProdutoDto } from "./dto/create-clienteproduto.dto";

@Injectable()
export class ClienteService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateClienteDto) {
        const cliente_existente = await this.prisma.cliente.findFirst({
            where: { nome: data.nome, fabrico_id: Number(data.fabrico_id) },
        });

        if (cliente_existente) {
            throw new ConflictException("Nome ja existe troque nesse fabrico");
        }

        try {
            return await this.prisma.cliente.create({
                data: {
                    ...data,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Cliente CNPJ Ja existe");
                }
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados invalidos");
            }
            throw error;
        }
    }

    async findAllByFabricoID(fabrico_id: number) {
        try {
            return this.prisma.cliente.findMany({
                where: { fabrico_id: Number(fabrico_id) },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new ConflictException("Erro ao buscar clientes");
            }

            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros de consulta inválidos");
            }

            throw error;
        }
    }

    async findAll() {
        try {
            return this.prisma.cliente.findMany();
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new ConflictException("Erro ao buscar clientes");
            }
        }
    }

    async findOne(id: number) {
        try {
            const cliente = await this.prisma.cliente.findFirst({
                where: { id },
            });

            if (!cliente) {
                throw new NotFoundException("Cliente não encontrado");
            }

            return cliente;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new ConflictException("Erro ao buscar cliente");
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros de consulta inválidos");
            }
            throw error;
        }
    }

    async update(id: number, data: UpdateClienteDto) {
        try {
            const cliente_existente = await this.prisma.cliente.findFirst({
                where: { nome: data.nome, fabrico_id: Number(data.fabrico_id), NOT: { id } },
            });

            if (cliente_existente) {
                throw new ConflictException("Nome ja existente ");
            }

            return this.prisma.cliente.update({
                where: { id, fabrico_id: Number(data.fabrico_id) },
                data,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new ConflictException("Não foi possível atualizar o cliente");
            }
            throw error;
        }
    }

    async remove(id: number) {
        try {
            await this.findOne(id);

            const totalVinculos = await this.prisma.clienteProduto.count({
                where: { cliente_id: id },
            });

            if (totalVinculos > 0) {
                throw new BadRequestException(
                    "Não é possível excluir um cliente que possui produtos vinculados.",
                );
            }

            return this.prisma.cliente.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new ConflictException("Erro ao deletar cliente");
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros de consulta inválidos");
            }
            throw error;
        }
    }

    async linkClientProduct(cliente_id: number, data: CreateClienteProdutoDto) {
        try {
            const produto_existe = await this.prisma.produto.findUnique({
                where: {
                    id: data.produto_id,
                },
            });

            if (!produto_existe) {
                throw new NotFoundException("Esse vinculo não existe");
            }

            return this.prisma.clienteProduto.create({
                data: {
                    cliente_id: cliente_id,
                    ...data,
                },
            });
        } catch (error) {
            if (error instanceof BadRequestException)
                throw new BadRequestException(
                    "Este produto já está vinculado a este cliente ou ocorreu um erro interno.",
                );
            throw error;
        }
    }

    async getAllProductByCliente(cliente_id: number) {
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

    async getAllClienteByProduct(product_id: number) {
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

    async removeLink(cliente_id: number, product_id: number) {
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
            throw new ConflictException("Erro ao processar a remoção do vínculo.");
        }
    }
}
