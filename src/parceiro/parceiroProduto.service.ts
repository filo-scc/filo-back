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
        fabricoId?: number,
    ) {
        const [produto, parceiro] = await Promise.all([
            this.produtoService.getById(produto_id),
            this.parceiroService.getById(parceiro_id, fabricoId),
        ]);

        if (fabricoId !== undefined && produto.fabrico_id !== fabricoId) {
            throw new NotFoundException("Produto nao encontrado");
        }

        if (produto.fabrico_id !== parceiro.fabrico_id) {
            throw new ConflictException("O produto e o parceiro devem pertencer ao mesmo fabrico");
        }

        const vinculoExiste = await this.prisma.parceiroProduto.findUnique({
            where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
        });

        if (vinculoExiste) {
            throw new ConflictException("Este produto já está vinculado a este parceiro");
        }

        return this.prisma.$transaction(async (tx) => {
            await this.produtoService.bloquearProdutosParaRecalculo([produto_id], tx);
            const vinculo = await tx.parceiroProduto.create({
                data: {
                    produto_id: produto_id,
                    parceiro_id: parceiro_id,
                    preco: data.preco ?? null,
                },
            });

            await this.produtoService.recalcularCustoTotal(produto_id, tx);
            return vinculo;
        });
    }

    async deleteParceiroProduto(parceiro_id: number, produto_id: number, fabricoId?: number) {
        const vinculo = await this.prisma.parceiroProduto.findUnique({
            where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
            include: { produto: true, parceiro: true },
        });

        if (!vinculo) throw new NotFoundException("Vínculo não encontrado");

        if (
            fabricoId !== undefined &&
            (vinculo.produto.fabrico_id !== fabricoId || vinculo.parceiro.fabrico_id !== fabricoId)
        ) {
            throw new NotFoundException("Vinculo nao encontrado");
        }

        return this.prisma.$transaction(async (tx) => {
            await this.produtoService.bloquearProdutosParaRecalculo([produto_id], tx);
            const vinculoRemovido = await tx.parceiroProduto.delete({
                where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
            });

            await this.produtoService.recalcularCustoTotal(produto_id, tx);
            return vinculoRemovido;
        });
    }

    async getProdutosByParceiro(parceiro_id: number, fabricoId?: number) {
        await this.parceiroService.getById(parceiro_id, fabricoId);

        return await this.prisma.parceiroProduto.findMany({
            where: {
                parceiro_id: parceiro_id,
                ...(fabricoId !== undefined ? { produto: { fabrico_id: fabricoId } } : {}),
            },
            include: { produto: true },
        });
    }

    async getParceiroByProduto(produto_id: number, fabricoId?: number) {
        const produto = await this.prisma.produto.findUnique({ where: { id: produto_id } });
        if (!produto) throw new NotFoundException("Produto não encontrado");

        if (fabricoId !== undefined && produto.fabrico_id !== fabricoId) {
            throw new NotFoundException("Produto nao encontrado");
        }

        return await this.prisma.parceiroProduto.findMany({
            where: {
                produto_id: produto_id,
                ...(fabricoId !== undefined ? { parceiro: { fabrico_id: fabricoId } } : {}),
            },
            include: { parceiro: true },
        });
    }

    async updateParceiroProduto(
        parceiro_id: number,
        produto_id: number,
        data: UpdateParceiroProdutoDto,
        fabricoId?: number,
    ) {
        const [produto, parceiro] = await Promise.all([
            this.produtoService.getById(produto_id),
            this.parceiroService.getById(parceiro_id, fabricoId),
        ]);

        if (fabricoId !== undefined && produto.fabrico_id !== fabricoId) {
            throw new NotFoundException("Produto nao encontrado");
        }

        if (produto.fabrico_id !== parceiro.fabrico_id) {
            throw new ConflictException("O produto e o parceiro devem pertencer ao mesmo fabrico");
        }

        const vinculo = await this.prisma.parceiroProduto.findUnique({
            where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
        });

        if (!vinculo) {
            throw new NotFoundException("Relacionamento não encontrado");
        }

        return this.prisma.$transaction(async (tx) => {
            await this.produtoService.bloquearProdutosParaRecalculo([produto_id], tx);
            const vinculoAtualizado = await tx.parceiroProduto.update({
                where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
                data: { preco: data.preco ?? null },
            });

            await this.produtoService.recalcularCustoTotal(produto_id, tx);
            return vinculoAtualizado;
        });
    }

    async getParceiroProduto(produto_id: number, parceiro_id: number, fabricoId?: number) {
        const vinculo = await this.prisma.parceiroProduto.findUnique({
            where: { produto_id_parceiro_id: { produto_id, parceiro_id } },
            include: { produto: true, parceiro: true },
        });

        if (
            !vinculo ||
            (fabricoId !== undefined &&
                (vinculo.produto.fabrico_id !== fabricoId ||
                    vinculo.parceiro.fabrico_id !== fabricoId))
        ) {
            throw new NotFoundException("Relacionamento nao encontrado");
        }

        return vinculo;
    }
}
