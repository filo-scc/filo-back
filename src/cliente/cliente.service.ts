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

@Injectable()
export class ClienteService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateClienteDto) {
        const {endereco, ...dadosCliente} = data;

    const cliente_existente = await this.prisma.cliente.findFirst({
            where: { nome: dadosCliente.nome, fabrico_id: Number(dadosCliente.fabrico_id) },
        });

        if (cliente_existente) {
            throw new ConflictException("Nome ja existe troque nesse fabrico");
        }

        try {
            return await this.prisma.cliente.create({
                data: {
                    ...dadosCliente,
                    fabrico_id: Number(dadosCliente.fabrico_id),
                    endereco: endereco ? {
                        create: {
                            rua: endereco.rua,
                            numero: endereco.numero,
                            bairro: endereco.bairro,
                            cidade: endereco.cidade,
                            estado: endereco.estado,
                            complemento: endereco.complemento,
                        }
                    } : undefined,
                },
                include: { endereco: true }
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
                include: { endereco: true }
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
            return this.prisma.cliente.findMany({
                include: { endereco: true }
            });
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
                include: { endereco: true }
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
        const { endereco, ...dadosCliente } = data;
        
        try {
            const cliente_existente = await this.prisma.cliente.findFirst({
                where: { nome: dadosCliente.nome, fabrico_id: Number(dadosCliente.fabrico_id), NOT: { id } },
            });

            if (cliente_existente) {
                throw new ConflictException("Nome ja existente ");
            }

            return this.prisma.cliente.update({
                where: { id, fabrico_id: Number(dadosCliente.fabrico_id) },
                data: {
                    ...dadosCliente,
                    endereco: endereco ? {
                        update: {
                            rua: endereco.rua,
                            numero: endereco.numero,
                            bairro: endereco.bairro,
                            cidade: endereco.cidade,
                            estado: endereco.estado,
                            complemento: endereco.complemento,
                        }
                    } : undefined,
                },                
                include: { endereco: true }
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
}
