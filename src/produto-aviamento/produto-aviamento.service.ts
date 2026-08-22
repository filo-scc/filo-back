import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProdutoAviamentoDto } from "./dto/create-produto-aviamento.dto";
import { UpdateProdutoAviamentoDto } from "./dto/update-produto-aviamento.dto";
import { ProdutoService } from "../produto/produto.service";

@Injectable()
export class ProdutoAviamentoService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly produtoService: ProdutoService,
    ) {}

    async create(createProdutoAviamentoDto: CreateProdutoAviamentoDto) {
        const produtoExiste = await this.prisma.produto.findUnique({
            where: { id: createProdutoAviamentoDto.produto_id },
        });
        if (!produtoExiste) throw new NotFoundException("Produto não encontrado");

        const aviamentoExiste = await this.prisma.aviamento.findUnique({
            where: { id: createProdutoAviamentoDto.aviamento_id },
        });
        if (!aviamentoExiste) throw new NotFoundException("Aviamento não encontrado");

        const relacaoExiste = await this.prisma.produtoAviamento.findFirst({
            where: {
                produto_id: createProdutoAviamentoDto.produto_id,
                aviamento_id: createProdutoAviamentoDto.aviamento_id,
            },
        });
        if (relacaoExiste) {
            throw new ConflictException("Esse aviamento já está vinculado a este produto");
        }

        return this.prisma.$transaction(async (tx) => {
            const vinculo = await tx.produtoAviamento.create({
                data: createProdutoAviamentoDto,
            });
            await this.produtoService.recalcularCustoTotal(
                createProdutoAviamentoDto.produto_id,
                tx,
            );
            return vinculo;
        });
    }

    async findAll() {
        return this.prisma.produtoAviamento.findMany({
            include: {
                produto: true,
                aviamento: true,
            },
        });
    }

    async findOne(id: number) {
        const relacao = await this.prisma.produtoAviamento.findUnique({
            where: { id },
            include: {
                produto: true,
                aviamento: true,
            },
        });

        if (!relacao) {
            throw new NotFoundException(
                "O relacionamento entre produto e aviamento não foi encontrado",
            );
        }

        return relacao;
    }

    async findAllByProduto(produto_id: number) {
        const produtoExiste = await this.prisma.produto.findUnique({
            where: { id: produto_id },
        });

        if (!produtoExiste) {
            throw new NotFoundException("Produto não encontrado");
        }

        return this.prisma.produtoAviamento.findMany({
            where: { produto_id },
            include: { aviamento: true },
        });
    }

    async findAllByAviamento(aviamento_id: number) {
        const aviamentoExiste = await this.prisma.aviamento.findUnique({
            where: { id: aviamento_id },
        });

        if (!aviamentoExiste) {
            throw new NotFoundException("Aviamento não encontrado");
        }

        return this.prisma.produtoAviamento.findMany({
            where: { aviamento_id },
            include: { produto: true },
        });
    }

    async update(id: number, payload: UpdateProdutoAviamentoDto) {
        const vinculoExistente = await this.findOne(id);

        return this.prisma.$transaction(async (tx) => {
            const vinculo = await tx.produtoAviamento.update({
                where: { id },
                data: payload,
            });
            await this.produtoService.recalcularCustoTotal(vinculoExistente.produto_id, tx);
            return vinculo;
        });
    }

    async remove(id: number) {
        const vinculoExistente = await this.findOne(id);

        return this.prisma.$transaction(async (tx) => {
            const vinculo = await tx.produtoAviamento.delete({
                where: { id },
            });
            await this.produtoService.recalcularCustoTotal(vinculoExistente.produto_id, tx);
            return vinculo;
        });
    }
}
