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
import { EnderecoService } from "../endereco/endereco.service";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@Injectable()
export class ClienteService {
    constructor(
        private prisma: PrismaService,
        private enderecoService: EnderecoService,
    ) {}

    async create(data: CreateClienteDto, user: BusinessAuthenticatedUser) {
        const { endereco, ...dadosCliente } = data;
        const fabricoId = user.fabrico_id;

        const clienteExistente = await this.prisma.cliente.findFirst({
            where: { nome: dadosCliente.nome, fabrico_id: fabricoId },
        });

        if (clienteExistente) {
            throw new ConflictException("Já existe um cliente com esse nome neste fabrico");
        }

        try {
            const cliente = await this.prisma.cliente.create({
                data: {
                    ...dadosCliente,
                    fabrico_id: fabricoId,
                },
            });

            const enderecoCriado = await this.enderecoService.create(endereco ?? {});

            await this.prisma.cliente.update({
                where: { id: cliente.id },
                data: { endereco: { connect: { id: enderecoCriado.id } } },
            });

            return { message: "Cliente criado com sucesso" };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    const fields = error.meta?.target as string[] | undefined;

                    if (fields?.includes("cnpj")) {
                        throw new ConflictException("CNPJ já cadastrado");
                    }

                    if (fields?.includes("nome")) {
                        throw new ConflictException("Nome já existe neste fabrico");
                    }

                    throw new ConflictException("Registro duplicado");
                }
            }

            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }

            throw error;
        }
    }

    async findAllByFabricoID(user: BusinessAuthenticatedUser) {
        try {
            return await this.prisma.cliente.findMany({
                where: { fabrico_id: user.fabrico_id },
                include: { endereco: true },
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

    async findOne(id: number, user: BusinessAuthenticatedUser) {
        try {
            const cliente = await this.prisma.cliente.findFirst({
                where: { id, fabrico_id: user.fabrico_id },
                include: { endereco: true },
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

    async update(id: number, data: UpdateClienteDto, user: BusinessAuthenticatedUser) {
        const { endereco, ...dadosCliente } = data;
        const fabricoId = user.fabrico_id;

        try {
            const clienteAtual = await this.findOne(id, user);

            if (dadosCliente.nome) {
                const clienteExistente = await this.prisma.cliente.findFirst({
                    where: {
                        nome: dadosCliente.nome,
                        fabrico_id: fabricoId,
                        NOT: { id },
                    },
                });

                if (clienteExistente) {
                    throw new ConflictException("Nome ja existente");
                }
            }

            if (endereco) {
                if (!clienteAtual.endereco) {
                    throw new NotFoundException("Endereço do cliente não encontrado");
                }
                await this.enderecoService.update(clienteAtual.endereco.id, endereco);
            }

            await this.prisma.cliente.update({
                where: { id },
                data: { ...dadosCliente },
            });

            return { message: "Cliente atualizado com sucesso" };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new ConflictException("Não foi possível atualizar o cliente");
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados invalidos");
            }
            throw error;
        }
    }

    async remove(id: number, user: BusinessAuthenticatedUser) {
        try {
            await this.findOne(id, user);

            return await this.prisma.cliente.delete({
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
}
