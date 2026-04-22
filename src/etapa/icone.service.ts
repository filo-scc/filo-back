import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { CreateIconeDto } from "../etapa/dto/create-icone.dto";
import { UpdateIconeDto } from "./dto/update-icone.dto";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class IconeService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateIconeDto) {
        try {
            return await this.prisma.icone.create({
                data: {
                    ...data,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Icone já cadastrado");
                }
            }

            throw error;
        }
    }

    async getAll() {
        return this.prisma.icone.findMany();
    }

    async getById(id: number) {
        const icone = await this.prisma.icone.findUnique({
            where: { id },
        });

        if (!icone) {
            throw new NotFoundException("Icone não encontrado");
        }

        return icone;
    }

    async update(id: number, data: UpdateIconeDto) {
        await this.getById(id);

        try {
            return await this.prisma.icone.update({
                where: { id },
                data: {
                    ...data,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Icone já cadastrado");
                }
            }

            throw error;
        }
    }

    async delete(id: number) {
        const icone = await this.prisma.icone.findUnique({
            where: { id },
        });

        if (!icone) {
            throw new NotFoundException("Ícone não encontrado");
        }

        try {
            return await this.prisma.icone.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2003") {
                    const count = await this.prisma.etapa.count({
                        where: { icone_id: id },
                    });

                    throw new ConflictException(
                        `Não é possível excluir: ícone está vinculado a ${count} etapa(s)`,
                    );
                }
            }
            throw error;
        }
    }
}
