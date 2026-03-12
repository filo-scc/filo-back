import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFabricoDto } from "./dto/create-fabrico.dto";

@Injectable()
export class FabricoService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateFabricoDto) {
        try {
            return this.prisma.fabrico.create({
                data: {
                    ...data,
                },
            });
        } catch (error) {
            console.log("Error creating fabrico:", error);
            throw error;
        }
    }

    async getAll() {
        return this.prisma.fabrico.findMany();
    }

    async getById(id: number) {
        return this.prisma.fabrico.findUnique({
            where: { id },
        });
    }

    async update(id: number, data: CreateFabricoDto) {
        return this.prisma.fabrico.update({
            where: { id },
            data: {
                ...data,
            },
        });
    }

    async delete(id: number) {
        return this.prisma.fabrico.delete({
            where: { id },
        });
    }
}
