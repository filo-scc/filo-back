import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFaccaoDto } from "./dto/create-faccao.dto";
import { UpdateFaccaoDto } from "./dto/update-faccao.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class FaccaoService {
    constructor(private prisma: PrismaService) {}

    async getAll() {
        try {
            return await this.prisma.faccao.findMany();
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                console.error("Erro conhecido pelo Prisma:", error.code);
            }

            throw error;
        }
    }

    async getAllFaccaoByFabrico(id: number) {
        const faccoes = await this.prisma.faccao.findMany({
            where: { fabrico_id: id },
        });

        return faccoes;
    }

    async getById(id: number) {
        const faccao = await this.prisma.faccao.findUnique({
            where: { id },
        });

        if (!faccao) {
            throw new NotFoundException("Facção não encontrada!");
        }

        return faccao;
    }

    async create(data: CreateFaccaoDto) {
        const existente = await this.prisma.faccao.findFirst({
            where: {
                nome: data.nome,
                fabrico_id: data.fabrico_id,
            },
        });

        if (existente) {
            throw new ConflictException("Já existe uma facção com esse nome nesse fabrico!");
        }

        await this.prisma.faccao.create({
            data: {
                nome: data.nome,
                telefone: data.telefone ?? null,
                fabrico_id: data.fabrico_id,
            },
        });

        return { message: "Facção criada com sucesso!" };
    }

    async update(id: number, data: UpdateFaccaoDto) {
        const existente = await this.prisma.faccao.findMany({
            where: {
                nome: data.nome,
                fabrico_id: data.fabrico_id,
                id: { not: id },
            },
        });

        if (existente) {
            throw new ConflictException("Já existe uma facção com esse nome nesse fabrico!");
        }

        await this.getById(id);

        await this.prisma.faccao.update({
            where: { id },
            data: {
                ...data,
            },
        });

        return { message: "Facção atualizada com sucesso!" };
    }

    async delete(id: number) {
        const faccao = await this.getById(id);

        if (!faccao) {
            throw new NotFoundException("Facção não encontrada!");
        }

        await this.prisma.faccao.delete({
            where: { id },
        });

        return { message: "Facção deletada com sucesso!" };
    }
}
