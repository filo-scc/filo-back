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

/* TODO: 
- Implementar segurança de fabrico em criar e atualizar cliente, garantindo que o usuário só possa criar/atualizar clientes para o fabrico ao qual ele pertence. 
*/

@Injectable()
export class ClienteService {
    constructor(
        private prisma: PrismaService,
        private enderecoService: EnderecoService,
    ) {}

    async create(data: CreateClienteDto) {
        const { endereco, ...dadosCliente } = data;

        const clienteExistente = await this.prisma.cliente.findFirst({
            where: { nome: dadosCliente.nome, fabrico_id: Number(dadosCliente.fabrico_id) },
        });

        if (clienteExistente) {
            throw new ConflictException("Já existe um cliente com esse nome neste fabrico");
        }

        try {
            const cliente = await this.prisma.cliente.create({
                data: {
                    ...dadosCliente,
                    fabrico_id: Number(dadosCliente.fabrico_id),
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

    async findAllByFabricoID(fabrico_id: number) {
        try {
            return await this.prisma.cliente.findMany({
                where: { fabrico_id: Number(fabrico_id) },
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

    async findAll() {
        try {
            return await this.prisma.cliente.findMany({
                include: { endereco: true },
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

    async update(id: number, data: UpdateClienteDto) {
        const { endereco, ...dadosCliente } = data;

        try {
            const cliente_existente = await this.prisma.cliente.findFirst({
                where: {
                    nome: dadosCliente.nome,
                    fabrico_id: Number(dadosCliente.fabrico_id),
                    NOT: { id },
                },
            });

            if (cliente_existente) {
                throw new ConflictException("Nome ja existente");
            }

            const clienteAtual = await this.findOne(id);

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

    async remove(id: number) {
        try {
            await this.findOne(id);

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
