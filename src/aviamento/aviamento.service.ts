import {
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma, Aviamento } from "@prisma/client";
import { CreateAviamentoDto } from "./dto/create-aviamento.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateAviamentoDto } from "./dto/update-aviamento.dto";

@Injectable()
export class AviamentoService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateAviamentoDto): Promise<Aviamento> {
        const fabricoExists = await this.prisma.fabrico.findUnique({
            where: {
                id: data.fabrico_id,
            },
        });

        if (!fabricoExists) {
            throw new NotFoundException("Fabrico não encontrado!");
        }

        try {
            return await this.prisma.aviamento.create({
                data: {
                    nome: data.nome,
                    fabrico_id: data.fabrico_id,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException(
                    "Já existe um aviamento com este nome para este fabrico",
                );
            }

            throw error;
        }
    }

    async findAll() {
        return this.prisma.aviamento.findMany();
    }

    async getById(id: number) {
        const aviamento = await this.prisma.aviamento.findUnique({ where: { id } });

        if (!aviamento) {
            throw new NotFoundException("Aviamento não encontrado");
        }

        return aviamento;
    }

    async findAllFabrico(fabrico_id: number) {
        const aviamentos = await this.prisma.aviamento.findMany({
            where: { fabrico_id: fabrico_id },
        });
        return aviamentos;
    }

    async delete(id: number) {
        const aviamento = await this.prisma.aviamento.findUnique({ where: { id } });
        if (aviamento) {
            await this.prisma.aviamento.delete({ where: { id } });
            return `O aviamento com o id ${id} foi deletado com sucesso`;
        } else {
            throw new NotFoundException("Aviamento não encontrado");
        }
    }

    async update(id: number, dados: UpdateAviamentoDto): Promise<Aviamento> {
        const aviamento = await this.prisma.aviamento.findUnique({
            where: { id },
        });

        if (!aviamento) {
            throw new NotFoundException("Aviamento não encontrado");
        }

        try {
            return await this.prisma.aviamento.update({
                where: { id },
                data: {
                    nome: dados.nome,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException(
                    "Já existe um aviamento com este nome para este fabrico",
                );
            }

            throw error;
        }
    }
}
