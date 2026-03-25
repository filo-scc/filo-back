import { Injectable, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEtapaDto } from "./dto/create-etapa.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class EtapaService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateEtapaDto) {
        if (data.icone_id) {
            const icone = await this.prisma.icone.findUnique({
                where: { id: data.icone_id },
            });

            if (!icone) {
                throw new NotFoundException("Ícone não encontrado");
            }
        }

        try {
            return await this.prisma.etapa.create({
                data: {
                    ...data,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Etapa já cadastrada");
                }

                if (error.code === "P2003") {
                    throw new NotFoundException("Ícone não encontrado");
                }
            }

            throw error;
        }
    }

    async findAllByFabricoID(fabrico_id: number) {
            try {
                return this.prisma.etapa.findMany({
                    where: { fabrico_id: Number(fabrico_id) },
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    throw new ConflictException("Erro ao buscar etapas");
                }
    
                if (error instanceof Prisma.PrismaClientValidationError) {
                    throw new BadRequestException("Parâmetros de consulta inválidos");
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
            throw new NotFoundException("Etapa não encontrada");
        }

        return etapa;
    }

    async update(id: number, data: CreateEtapaDto) {
    await this.getById(id);

    if (data.icone_id !== undefined && data.icone_id !== null) {
        const icone = await this.prisma.icone.findUnique({
            where: { id: data.icone_id },
        });

        if (!icone) {
            throw new NotFoundException("Ícone não encontrado");
        }
    }

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
                throw new ConflictException("Etapa já cadastrada");
            }

            if (error.code === "P2003") {
                throw new NotFoundException("Relacionamento inválido");
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
