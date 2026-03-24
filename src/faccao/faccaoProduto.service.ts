import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateFaccaoProdutoDto } from "./dto/update-faccaoproduto.dto";
import { CreateFaccaoProdutoDto } from "./dto/create-faccaoproduto.dto";

@Injectable()
export class FaccaoProdutoService {
    constructor(private prisma: PrismaService) {}

    async createFaccaoProduto(faccao_id: number, produto_id: number, data: CreateFaccaoProdutoDto) {
        const produto = await this.prisma.produto.findUnique({ where: { id: produto_id } });
        if (!produto) throw new NotFoundException("Produto não encontrado");

        const faccao = await this.prisma.faccao.findUnique({ where: { id: faccao_id } });
        if (!faccao) throw new NotFoundException("Facção não encontrada");

        if (produto.fabrico_id !== faccao.fabrico_id) {
            throw new ConflictException(
                "O produto e a facção devem pertencer ao mesmo fabrico",
            );
        }

        const vinculoExiste = await this.prisma.faccaoProduto.findUnique({
            where: { produto_id_faccao_id: { produto_id, faccao_id } },
        });
        if (vinculoExiste)
            throw new ConflictException("Este produto já está vinculado a esta facção");

        return await this.prisma.faccaoProduto.create({
            data: {
                produto_id: produto_id,
                faccao_id: faccao_id,
                preco: data.preco,
            },
        });
    }

    async deleteFaccaoProduto(faccao_id: number, produto_id: number) {
        const vinculo = await this.prisma.faccaoProduto.findUnique({
            where: { produto_id_faccao_id: { produto_id, faccao_id } },
        });

        if (!vinculo) throw new NotFoundException("Vínculo não encontrado");

        return await this.prisma.faccaoProduto.delete({
            where: { produto_id_faccao_id: { produto_id, faccao_id } },
        });
    }

    async getProdutosByFaccao(faccao_id: number) {
        const faccao = await this.prisma.faccao.findUnique({ where: { id: faccao_id } });
        if (!faccao) throw new NotFoundException("Facção não encontrada");

        return await this.prisma.faccaoProduto.findMany({
            where: { faccao_id: faccao_id },
            include: { produto: true },
        });
    }

    async getFaccaoByProduto(produto_id: number) {
        const produto = await this.prisma.produto.findUnique({ where: { id: produto_id } });
        if (!produto) throw new NotFoundException("Produto não encontrado");

        return await this.prisma.faccaoProduto.findMany({
            where: { produto_id: produto_id },
            include: { faccao: true },
        });
    }

    async updateFaccaoProduto(faccao_id: number, produto_id: number, data: UpdateFaccaoProdutoDto) {
        const vinculo = await this.prisma.faccaoProduto.findUnique({
            where: { produto_id_faccao_id: { produto_id, faccao_id } },
        });

        if (!vinculo) throw new NotFoundException("Relacionamento não encontrado");

        return await this.prisma.faccaoProduto.update({
            where: { produto_id_faccao_id: { produto_id, faccao_id } },
            data: { preco: data.preco },
        });
    }
}
