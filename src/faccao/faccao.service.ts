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

    async linkProdutos(faccao_id: number, produto_id: number, preco: number) {
        const produto = await this.prisma.produto.findUnique({ where: { id: produto_id } });
        if (!produto) {
            throw new NotFoundException("Produto não encontrado");
        }

        const faccao = await this.prisma.faccao.findUnique({ where: { id: faccao_id } });
        if (!faccao) {
            throw new NotFoundException("Facção não encontrada");
        }

        try {
            await this.prisma.faccaoProduto.create({
                data: {
                    produto_id: produto_id,
                    faccao_id: faccao_id,
                    preco: preco,
                },
            });
            return { message: "Produto vinculado com sucesso a Facção" };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Este produto já está vinculado a esta facção");
            }
            throw error;
        }
    }

    async desvProdutos(faccao_id: number, produto_id: number) {
        try {
            await this.prisma.faccaoProduto.delete({
                where: {
                    produto_id_faccao_id: { produto_id, faccao_id },
                },
            });
            return { message: "Vínculo removido com sucesso" };
        } catch {
            throw new NotFoundException("Vínculo não encontrado para ser removido");
        }
    }

    async getProdutosByFaccao(faccao_id: number) {
        const faccao = await this.prisma.faccao.findUnique({ where: { id: faccao_id } });
        if (!faccao) {
            throw new NotFoundException("Facção não encontrada");
        }
        const vinculos = await this.prisma.faccaoProduto.findMany({
            where: {
                faccao_id: faccao_id,
            },
            include: {
                produto: true,
            },
        });
        return vinculos.map((vinculo) => ({
            preco: vinculo.preco,
            produto: vinculo.produto,
        }));
    }

    async getFaccaoByProduto(produto_id: number) {
        const produto = await this.prisma.produto.findUnique({ where: { id: produto_id } });
        if (!produto) {
            throw new NotFoundException("Produto não encontrada");
        }
        const vinculos = await this.prisma.faccaoProduto.findMany({
            where: {
                produto_id: produto_id,
            },
            include: {
                faccao: true,
            },
        });
        return vinculos.map((vinculo) => ({
            preco: vinculo.preco, 
            faccao: vinculo.faccao, 
        }));
    }
}
