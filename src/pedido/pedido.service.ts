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

const PALETA_13_CORES = [
    "#7FA9B8",
    "#9DB7A5",
    "#5F8F9B",
    "#A89FBF",
    "#8FAF7A",
    "#6E8CA5",
    "#B88772",
    "#8E9CA8",
    "#8D7FA8",
    "#A288C7",
    "#5F9EA0",
    "#B86A7B",
    "#7E8F4E",
];

@Injectable()
export class PedidoService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreatePedidoDto, fabricoId: number): Promise<Pedido> {
        if (data.cliente_id) {
            const clienteExists = await this.prisma.cliente.findFirst({
                where: { id: data.cliente_id, fabrico_id: fabricoId },
            });

            if (!clienteExists) {
                throw new NotFoundException("Cliente não encontrado!");
            }
        }

        const ultimoPedido = await this.prisma.pedido.findFirst({
            where: {
                fabrico_id: fabricoId,
                numero: { not: null },
            },
            orderBy: {
                numero: "desc",
            },
        });

        const numero = (ultimoPedido?.numero ?? 0) + 1;

        const corPedido = data.usarCorPaleta ? await this.getCorPaleta(fabricoId) : "#FFFFFF";

        try {
            return await this.prisma.pedido.create({
                data: {
                    finalizado: data.finalizado ?? false,
                    data_prevista: data.data_prevista ? new Date(data.data_prevista) : null,
                    observacoes: data.observacoes,
                    cliente_id: data.cliente_id,
                    fabrico_id: fabricoId,
                    numero: numero,
                    cor: corPedido,
                    quantidade: data.quantidade,
                    valor_total: data.valor_total,
                    custo_total: data.custo_total,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Já existe um pedido com dados conflitantes!");
            }

            throw new InternalServerErrorException("Erro ao criar o pedido!");
        }
    }

    async findAll(fabricoId: number) {
        return this.prisma.pedido.findMany({
            where: { fabrico_id: fabricoId },
            include: {
                cliente: true,
                fichas_tecnicas: {
                    include: { fichas_etapas: true },
                },
            },
        });
    }

    async getById(id: number, fabricoId: number) {
        const pedido = await this.prisma.pedido.findFirst({
            where: { id, fabrico_id: fabricoId },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        return pedido;
    }

    async delete(id: number, fabricoId: number) {
        const pedido = await this.prisma.pedido.findFirst({
            where: { id, fabrico_id: fabricoId },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        await this.prisma.pedido.delete({ where: { id: pedido.id } });
        return `O pedido com o id ${id} foi deletado com sucesso`;
    }

    async update(id: number, data: UpdatePedidoDto, fabricoId: number): Promise<Pedido> {
        const pedido = await this.prisma.pedido.findFirst({
            where: { id, fabrico_id: fabricoId },
        });

        if (!pedido) {
            throw new NotFoundException("Pedido não encontrado!");
        }

        if (data.cliente_id !== undefined && data.cliente_id !== null) {
            const cliente = await this.prisma.cliente.findFirst({
                where: { id: data.cliente_id, fabrico_id: fabricoId },
            });

            if (!cliente) {
                throw new NotFoundException("Cliente não encontrado!");
            }
        }

        return await this.prisma.pedido.update({
            where: { id: pedido.id },
            data: {
                finalizado: data.finalizado,
                data_prevista: data.data_prevista ? new Date(data.data_prevista) : null,
                observacoes: data.observacoes,
                cliente_id: data.cliente_id,
                valor_total: data.valor_total,
                custo_total: data.custo_total,
            },
        });
    }

    async findAllCliente(cliente_id: number, fabricoId: number) {
        return this.prisma.pedido.findMany({
            where: { cliente_id, fabrico_id: fabricoId },
        });
    }

    private async getCorPaleta(fabricoId: number): Promise<string> {
        const pedidosAtivos = await this.prisma.pedido.findMany({
            where: {
                fabrico_id: fabricoId,
                finalizado: false,
                NOT: { cor: { equals: "#FFFFFF", mode: "insensitive" } },
            },
            select: { cor: true },
        });
        const coresEmUso = pedidosAtivos.map((p) => p.cor?.toUpperCase()).filter(Boolean);

        return (
            PALETA_13_CORES.find((c) => !coresEmUso.includes(c.toUpperCase())) ?? PALETA_13_CORES[0]
        );
    }
}
