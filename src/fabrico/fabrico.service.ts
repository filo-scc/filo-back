import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFabricoDto } from "./dto/create-fabrico.dto";
import { Cargo, Prisma } from "@prisma/client";
import { AuthenticatedUser } from "src/auth/types/authenticated-user";

@Injectable()
export class FabricoService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateFabricoDto) {
        try {
            return await this.prisma.fabrico.create({
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
        return this.prisma.fabrico.findMany();
    }

    async getByIdForUser(id: number, user: AuthenticatedUser) {
        const fabrico = await this.prisma.fabrico.findFirst({
            where: user.cargo === Cargo.ADMIN ? { id } : { AND: [{ id }, { id: user.fabrico_id }] },
        });

        if (!fabrico) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return fabrico;
    }

    async update(id: number, data: CreateFabricoDto) {
        await this.getById(id);

        try {
            return await this.prisma.fabrico.update({
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

        return this.prisma.fabrico.delete({
            where: { id },
        });
    }

    async getById(id: number) {
        const fabrico = await this.prisma.fabrico.findUnique({ where: { id } });

        if (!fabrico) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return fabrico;
    }
}
