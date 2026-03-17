import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CreateUserDto } from "./dto/create-user-dto";
import { UpdateUserDto } from "./dto/update-user-dto";

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateUserDto) {
        const existente = await this.prisma.usuario.findFirst({
            where: {
                nome: data.nome,
                fabrico_id: data.fabrico_id,
            },
        });

        if (existente) {
            throw new ConflictException("Já existe um usuário com esse nome no seu fabrico!");
        }

        await this.prisma.usuario.create({
            data: {
                ...data,
            },
        });

        return { message: "Usuário criado com sucesso!" };
    }

    async getAllByFabricoId(fabrico_id: number) {
        return this.prisma.usuario.findMany({
            where: { fabrico_id },
        });
    }

    async getById(id: number) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id },
        });

        if (!usuario) {
            throw new NotFoundException("Usuário não encontrado");
        }

        return usuario;
    }

    async update(id: number, data: UpdateUserDto) {
        try {
            const existente = await this.prisma.usuario.findFirst({
                where: {
                    nome: data.nome,
                    fabrico_id: data.fabrico_id,
                    id: { not: id },
                },
            });

            if (existente) {
                throw new ConflictException("Já existe um usuário com esse nome no seu fabrico!");
            }

            await this.getById(id);

            await this.prisma.usuario.update({
                where: { id },
                data: {
                    ...data,
                },
            });

            return { message: "Usuário atualizado com sucesso!" };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Email já cadastrado");
                }
            }

            throw error;
        }
    }

    async delete(id: number) {
        await this.getById(id);

        await this.prisma.usuario.delete({
            where: { id },
        });

        return { message: "Usuário deletado com sucesso!" };
    }
}
