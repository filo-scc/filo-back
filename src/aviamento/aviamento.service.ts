import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Aviamento } from "@prisma/client";
import { CreateAviamentoDto } from "./dto/create-aviamento.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateAviamentoDto } from "./dto/update-aviamento.dto";
import { ProdutoService } from "src/produto/produto.service";

@Injectable()
export class AviamentoService {
    constructor(
        private prisma: PrismaService,
        private readonly produtoService: ProdutoService,
    ) {}

    async create(data: CreateAviamentoDto): Promise<Aviamento> {
        const fabricoExists = await this.prisma.fabrico.findUnique({
            where: {
                id: data.fabrico_id,
            },
        });

        if (!fabricoExists) {
            throw new NotFoundException("Fabrico não encontrado!");
        }

        try {
            return await this.prisma.aviamento.create({
                data: {
                    nome: data.nome,
                    fabrico_id: data.fabrico_id,
                    custo_unitario: data.custo_unitario,
                    unidade_de_medida: data.unidade_de_medida,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException(
                    "Já existe um aviamento com este nome para este fabrico",
                );
            }

            throw error;
        }
    }

    async findAll() {
        return this.prisma.aviamento.findMany();
    }

    async getById(id: number) {
        const aviamento = await this.prisma.aviamento.findUnique({ where: { id } });

        if (!aviamento) {
            throw new NotFoundException("Aviamento não encontrado");
        }

        return aviamento;
    }

    async findAllFabrico(fabrico_id: number) {
        const aviamentos = await this.prisma.aviamento.findMany({
            where: { fabrico_id: fabrico_id },
        });
        return aviamentos;
    }

    async delete(id: number) {
        const aviamento = await this.prisma.aviamento.findUnique({ where: { id } });
        if (aviamento) {
            await this.prisma.$transaction(async (tx) => {
                const vinculos = await tx.produtoAviamento.findMany({
                    where: { aviamento_id: id },
                    select: { produto_id: true },
                });
                await this.produtoService.bloquearProdutosParaRecalculo(
                    vinculos.map((vinculo) => vinculo.produto_id),
                    tx,
                );
                await tx.aviamento.delete({ where: { id } });
                await this.produtoService.recalcularCustosTotais(
                    vinculos.map((vinculo) => vinculo.produto_id),
                    tx,
                );
            });
            return `O aviamento com o id ${id} foi deletado com sucesso`;
        } else {
            throw new NotFoundException("Aviamento não encontrado");
        }
    }

    async update(id: number, dados: UpdateAviamentoDto): Promise<Aviamento> {
        const aviamento = await this.prisma.aviamento.findUnique({
            where: { id },
        });

        if (!aviamento) {
            throw new NotFoundException("Aviamento não encontrado");
        }

        try {
            return await this.prisma.$transaction(async (tx) => {
                const vinculos = await tx.produtoAviamento.findMany({
                    where: { aviamento_id: id },
                    select: { produto_id: true },
                });
                await this.produtoService.bloquearProdutosParaRecalculo(
                    vinculos.map((vinculo) => vinculo.produto_id),
                    tx,
                );
                const aviamentoAtualizado = await tx.aviamento.update({
                    where: { id },
                    data: {
                        nome: dados.nome,
                        fabrico_id: dados.fabrico_id,
                        custo_unitario: dados.custo_unitario,
                        unidade_de_medida: dados.unidade_de_medida,
                    },
                });
                await this.produtoService.recalcularCustosTotais(
                    vinculos.map((vinculo) => vinculo.produto_id),
                    tx,
                );
                return aviamentoAtualizado;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException(
                    "Já existe um aviamento com este nome para este fabrico",
                );
            }

            throw error;
        }
    }
}
