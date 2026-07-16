import {
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from "@nestjs/common";
import { Prisma, Pedido } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreatePedidoDto } from "./dto/create-pedido.dto";
import { UpdatePedidoDto } from "./dto/update-pedido.dto";

@Injectable()
export class PedidoService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreatePedidoDto): Promise<Pedido> {
        const fabricoExists = await this.prisma.fabrico.findUnique({
            where: { id: data.fabrico_id },
        });

        if (!fabricoExists) {
            throw new NotFoundException("Fabrico não encontrado!");
        }

        if (data.cliente_id) {
            const clienteExists = await this.prisma.cliente.findUnique({
                where: { id: data.cliente_id },
            });

            if (!clienteExists) {
                throw new NotFoundException("Cliente não encontrado!");
            }
        }

        try {
            return await this.prisma.pedido.create({
                data: {
                    finalizado: data.finalizado,
                    data_prevista: data.data_prevista ? new Date(data.data_prevista) : null,
                    observacoes: data.observacoes,
                    cliente_id: data.cliente_id,
                    fabrico_id: data.fabrico_id,
                    numero: data.numero,
                    cor: data.cor,
                    quantidade: data.quantidade,
                    valor_total: data.valor_total,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Já existe um pedido com dados conflitantes!");
            }

            throw new InternalServerErrorException("Erro ao criar o pedido!");
        }
    }

    async findAll() {
        return this.prisma.pedido.findMany();
    }

    async getById(id: number) {
        const pedido = await this.prisma.pedido.findUnique({ where: { id } });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        return pedido;
    }

    async delete(id: number) {
        const pedido = await this.prisma.pedido.findUnique({ where: { id } });
        if (pedido) {
            await this.prisma.pedido.delete({ where: { id } });
            return `O pedido com o id ${id} foi deletado com sucesso`;
        } else {
            throw new NotFoundException("Pedido não encontrado!");
        }
    }

    async update(id: number, data: UpdatePedidoDto): Promise<Pedido> {
        const pedido = await this.prisma.pedido.findUnique({
            where: { id },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        if (data.cliente_id !== undefined && data.cliente_id !== null) {
            const cliente = await this.prisma.cliente.findUnique({
                where: { id: data.cliente_id },
            });

            if (!cliente) {
                throw new NotFoundException("Cliente não encontrado!");
            }
        }

        if (data.fabrico_id !== undefined && data.fabrico_id !== null) {
            const fabrico = await this.prisma.fabrico.findUnique({
                where: { id: data.fabrico_id },
            });

            if (!fabrico) {
                throw new NotFoundException("Fabrico não encontrado!");
            }
        }

        return await this.prisma.pedido.update({
            where: { id },
            data: {
                finalizado: data.finalizado,
                data_prevista: data.data_prevista ? new Date(data.data_prevista) : null,
                observacoes: data.observacoes,
                cliente_id: data.cliente_id,
            },
        });
    }

    async findAllFabrico(fabrico_id: number) {
        const pedidos = await this.prisma.pedido.findMany({
            where: { fabrico_id: fabrico_id },
        });
        return pedidos;
    }

    async findAllCliente(cliente_id: number) {
        const pedidos = await this.prisma.pedido.findMany({
            where: { cliente_id: cliente_id },
        });
        return pedidos;
    }
}
