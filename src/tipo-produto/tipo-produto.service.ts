import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTipoProdutoDto } from "./dto/create-tipo-produto.dto";
import { Prisma } from "@prisma/client";
import type { BusinessAuthenticatedUser } from "src/auth/types/authenticated-user";

@Injectable()
export class TipoProdutoService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateTipoProdutoDto, user: BusinessAuthenticatedUser) {
        const fabricoId = user.fabrico_id;

        try {
            return await this.prisma.tipoProduto.create({
                data: {
                    nome: data.nome,
                    fabrico_id: fabricoId,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Já existe um tipo de produto com esse nome.");
            }

            throw error;
        }
    }

    async findAllByFabrico(fabricoId: number, user?: BusinessAuthenticatedUser) {
        if (user && fabricoId !== user.fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        return this.prisma.tipoProduto.findMany({
            where: {
                fabrico_id: user?.fabrico_id ?? fabricoId,
            },
            orderBy: {
                nome: "asc",
            },
        });
    }
}
