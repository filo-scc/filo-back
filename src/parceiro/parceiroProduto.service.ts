import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateParceiroProdutoDto } from "./dto/update-parceiroproduto.dto";
import { CreateParceiroProdutoDto } from "./dto/create-parceiroproduto.dto";
import { ProdutoService } from "src/produto/produto.service";
import { ParceiroService } from "./parceiro.service";

@Injectable()
export class ParceiroProdutoService {
    constructor(
        private prisma: PrismaService,
        private readonly produtoService: ProdutoService,
        private readonly parceiroService: ParceiroService,
    ) {}

    async createParceiroProduto(
        parceiro_id: number,
        produto_id: number,
        data: CreateParceiroProdutoDto,
    ) {
        const [produto, parceiro] = await Promise.all([
            this.produtoService.getById(produto_id),
            this.parceiroService.getById(parceiro_id),
        ]);

        if (produto.fabrico_id !== parceiro.fabrico_id) {
            throw new ConflictException("O produto e o parceiro devem pertencer ao mesmo fabrico");
        }

        const vinculoExiste = await this.prisma.parceiroProduto.findUnique({
            where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
        });

        if (vinculoExiste) {
            throw new ConflictException("Este produto já está vinculado a este parceiro");
        }

        return await this.prisma.parceiroProduto.create({
            data: {
                produto_id: produto_id,
                parceiro_id: parceiro_id,
                preco: data.preco,
            },
        });
    }

    async deleteParceiroProduto(parceiro_id: number, produto_id: number) {
        const vinculo = await this.prisma.parceiroProduto.findUnique({
            where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
        });

        if (!vinculo) throw new NotFoundException("Vínculo não encontrado");

        return await this.prisma.parceiroProduto.delete({
            where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
        });
    }

    async getProdutosByParceiro(parceiro_id: number) {
        const parceiro = await this.prisma.parceiro.findUnique({ where: { id: parceiro_id } });
        if (!parceiro) throw new NotFoundException("Parceiro não encontrado");

        return await this.prisma.parceiroProduto.findMany({
            where: { parceiro_id: parceiro_id },
            include: { produto: true },
        });
    }

    async getParceiroByProduto(produto_id: number) {
        const produto = await this.prisma.produto.findUnique({ where: { id: produto_id } });
        if (!produto) throw new NotFoundException("Produto não encontrado");

        return await this.prisma.parceiroProduto.findMany({
            where: { produto_id: produto_id },
            include: { parceiro: true },
        });
    }

    async updateParceiroProduto(
        parceiro_id: number,
        produto_id: number,
        data: UpdateParceiroProdutoDto,
    ) {
        const [produto, parceiro] = await Promise.all([
            this.produtoService.getById(produto_id),
            this.parceiroService.getById(parceiro_id),
        ]);

        if (produto.fabrico_id !== parceiro.fabrico_id) {
            throw new ConflictException("O produto e o parceiro devem pertencer ao mesmo fabrico");
        }

        const vinculo = await this.prisma.parceiroProduto.findUnique({
            where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
        });

        if (!vinculo) {
            throw new NotFoundException("Relacionamento não encontrado");
        }

        return await this.prisma.parceiroProduto.update({
            where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
            data: { preco: data.preco },
        });
    }

    async getParceiroProduto(produto_id: number, parceiro_id: number) {
        const vinculo = await this.prisma.parceiroProduto.findUnique({
            where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
            include: { produto: true, parceiro: true },
        });

        return vinculo;
    }
}
