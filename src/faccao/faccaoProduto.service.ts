import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class FaccaoProdutoService {
    constructor(private prisma: PrismaService) {}

    async linkProdutos(faccao_id: number, produto_id: number, preco: number) {
        const produto = await this.prisma.produto.findUnique({ where: { id: produto_id } });
        if (!produto) {
            throw new NotFoundException("Produto não encontrado");
        }

        const faccao = await this.prisma.faccao.findUnique({ where: { id: faccao_id } });
        if (!faccao) {
            throw new NotFoundException("Facção não encontrada");
        }

        if (produto.fabrico_id !== faccao.fabrico_id) {
            throw new ConflictException(
                "O produto e a facção devem pertencer ao mesmo fabrico para serem vinculados",
            );
        }

        try {
            await this.prisma.faccaoProduto.create({
                data: {
                    produto_id: produto_id,
                    faccao_id: faccao_id,
                    preco: preco,
                },
            });
            return { message: "Produto vinculado com sucesso" };
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
                where: { produto_id_faccao_id: { produto_id, faccao_id } },
            });
            return { message: "Vínculo removido com sucesso" };
        } catch {
            throw new NotFoundException("Vínculo não encontrado");
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

    async updateFaccaoProduto(precoNovo: number, faccao_id: number, produto_id: number) {
        const vinculo = await this.prisma.faccaoProduto.findFirst({
            where: { faccao_id, produto_id },
        });
        if (!vinculo) throw new NotFoundException("Relacionamento não encontrado");

        await this.prisma.faccaoProduto.updateMany({
            where: { faccao_id, produto_id },
            data: { preco: precoNovo },
        });
        return { message: "Preço atualizado com sucesso!" };
    }
}
