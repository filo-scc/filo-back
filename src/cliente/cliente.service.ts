import { Injectable } from "@nestjs/common";
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { UpdateClienteDto } from "./dto/update-cliente.dto";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class ClienteService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateClienteDto, fabrico_id: number) {
        try {
            return await this.prisma.cliente.create({
                data: {
                    ...data,
                    fabrico_id,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new Error("Cliente with this CNPJ already exists");
                }
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new Error("Invalid data provided");
            }
            if (error instanceof Prisma.PrismaClientInitializationError) {
                throw new Error("Database connection failed");
            }
            if (error instanceof Prisma.PrismaClientRustPanicError) {
                throw new Error("Unexpected error occurred");
            }
            throw error;
        }
    }

    async findAll(fabrico_id: number) {
        try {
            return this.prisma.cliente.findMany({
                where: { fabrico_id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new Error("Erro ao buscar clientes");
            }

            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new Error("Parâmetros de consulta inválidos");
            }

            throw error;
        }
    }

    async findOne(fabrico_id: number, id: number) {
        try {
            const cliente = await this.prisma.cliente.findFirst({
                where: { id, fabrico_id },
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            return cliente;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new Error("Erro ao buscar cliente");
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new Error("Parâmetros de consulta inválidos");
            }
            throw error;
        }
    }

    async update(fabrico_id: number, id: number, data: UpdateClienteDto) {
        try {
            await this.findOne(fabrico_id, id);

            return this.prisma.cliente.update({
                where: { id, fabrico_id },
                data,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new Error("Não foi possível atualizar o cliente");
            }
            throw error;
        }
    }

    async remove(fabrico_id: number, id: number) {
        try {
            const cliente = await this.prisma.cliente.findFirst({
                where: { id, fabrico_id },
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            return this.prisma.cliente.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new Error("Erro ao deletar cliente");
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new Error("Parâmetros de consulta inválidos");
            }
            throw error;
        }
    }
}
