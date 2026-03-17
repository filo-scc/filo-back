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
            console.error("ERRO getAll:", error);

            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                console.error("Erro conhecido pelo Prisma:", error.code);
            }

            if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                console.error("Erro não conhecido pelo Prisma:");
            }

            if (error instanceof Prisma.PrismaClientInitializationError) {
                console.error("Erro de inicialização do Prisma:");
            }

            if (error instanceof Prisma.PrismaClientRustPanicError) {
                console.error("Erro pânico do Prisma:");
            }

            throw error;
        }
    }

    async getAllFaccaoByFabrico(id: number) {
        try {
            const faccoes = await this.prisma.faccao.findMany({
                where: { fabrico_id: id },
            });

            if (!faccoes || faccoes.length === 0) {
                throw new NotFoundException("Nenhuma facção encontrada para esse fabrico!");
            }

            return faccoes;
        } catch (error) {
            console.log("ERRO getAllFaccaoByFabrico:", error);
            throw error;
        }
    }

    async getById(id: number) {
        try {
            const faccao = await this.prisma.faccao.findUnique({
                where: { id },
            });

            if (!faccao) {
                throw new NotFoundException("Facção não encontrada!");
            }

            return faccao;
        } catch (error) {
            console.log("ERRO getById: ", error);
            throw error;
        }
    }

    async create(data: CreateFaccaoDto) {
        try {
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
        } catch (error) {
            console.log("ERRO create: ");
            throw error;
        }
    }

    async update(id: number, data: UpdateFaccaoDto) {
        const existente = await this.prisma.faccao.findMany({
            where: {
                nome: data.nome,
                fabrico_id: data.fabrico_id,
            },
        });

        if (existente.length > 0) {
            if (existente[0].nome == data.nome && existente[0].id != id) {
                throw new ConflictException("Já existe uma facção com esse nome nesse fabrico!");
            }
        }

        await this.prisma.faccao.update({
            where: { id },
            data: {
                ...data,
            },
        });

        return { message: "Facção atualizada com sucesso!" };
    }

    async delete(id: number) {
        try {
            const faccao = await this.prisma.faccao.findUnique({
                where: { id },
            });

            if (!faccao) {
                throw new NotFoundException("Facção não encontrada!");
            }

            await this.prisma.faccao.delete({
                where: { id },
            });

            return { message: "Facção deletada com sucesso!" };
        } catch (error) {
            console.log("ERRO delete: ");
            throw new error();
        }
    }
}
