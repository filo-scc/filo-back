import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEtapaDto } from "./dto/create-etapa.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class EtapaService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateEtapaDto) {
        try {
            return await this.prisma.etapa.create({
                data: {
                    ...data,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("CNPJ já cadastrado");
                }
            }

            throw error;
        }
    }

    async getAll() {
        return this.prisma.etapa.findMany();
    }

    async getById(id: number) {
        const etapa = await this.prisma.etapa.findUnique({
            where: { id },
        });

        if (!etapa) {
            throw new NotFoundException("Etapa não encontrado");
        }

        return etapa;
    }

    async update(id: number, data: CreateEtapaDto) {
        await this.getById(id);

        try {
            return await this.prisma.etapa.update({
                where: { id },
                data: {
                    ...data,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("CNPJ já cadastrado");
                }
            }

            throw error;
        }
    }

    async delete(id: number) {
        await this.getById(id);

        return this.prisma.etapa.delete({
            where: { id },
        });
    }
}
