import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTecidosDto } from "./dto/create-tecidos.dto";
import { UpdateTecidosDto } from "./dto/update-tecidos.dto";

@Injectable()
export class TecidosService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dataTecidos: CreateTecidosDto) {
        const tecido = dataTecidos;

        const nomeExistente = await this.prisma.tecido.findFirst({
            where: {
                nome: tecido.nome,
                fabrico_id: tecido.fabrico_id,
            },
        });

        if (nomeExistente) {
            throw new ConflictException("Tecido já existe");
        }

        return this.prisma.tecido.create({
            data: tecido,
        });
    }

    async findAll() {
        return this.prisma.tecido.findMany({
            orderBy: { nome: "asc" },
        });
    }

    async findOne(id: number) {
        const tecido = await this.prisma.tecido.findUnique({
            where: { id },
        });
        if (!tecido) {
            throw new ConflictException("Tecido não encontrado");
        }
        return tecido;
    }

    async findAllByFabrico(idFabrico: number) {
        return this.prisma.tecido.findMany({
            where: { fabrico_id: idFabrico },
            orderBy: { nome: "asc" },
        });
    }

    async update(id: number, data: UpdateTecidosDto) {
        const tecidoExistente = await this.prisma.tecido.findUnique({
            where: { id },
        });

        if (!tecidoExistente) {
            throw new ConflictException("Tecido não encontrado");
        }

        const nomeExistente = await this.prisma.tecido.findFirst({
            where: {
                nome: data.nome,
                id: { not: id },
            },
        });

        if (nomeExistente) {
            throw new ConflictException("Tecido com esse nome já existe");
        }

        return this.prisma.tecido.update({
            where: { id },
            data,
        });
    }

    async remove(id: number) {
        const tecidoExistente = await this.prisma.tecido.findUnique({
            where: { id },
        });

        if (!tecidoExistente) {
            throw new ConflictException("Tecido não encontrado");
        }

        return this.prisma.tecido.delete({
            where: { id },
        });
    }
}
