import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTecidosDto } from "./dto/create-tecidos.dto";
import { UpdateTecidosDto } from "./dto/update-tecidos.dto";
import { ProdutoService } from "src/produto/produto.service";

@Injectable()
export class TecidosService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly produtoService: ProdutoService,
    ) {}

    async create(dataTecidos: CreateTecidosDto) {
        const tecido = dataTecidos;

        const nomeExistente = await this.prisma.tecido.findFirst({
            where: {
                nome: tecido.nome,
                fabrico_id: tecido.fabrico_id,
            },
        });

        if (nomeExistente) {
            throw new ConflictException("Tecido já existe");
        }

        return this.prisma.tecido.create({
            data: tecido,
        });
    }

    async findAll() {
        return this.prisma.tecido.findMany({
            orderBy: { nome: "asc" },
        });
    }

    async findOne(id: number) {
        const tecido = await this.prisma.tecido.findUnique({
            where: { id },
        });
        if (!tecido) {
            throw new NotFoundException("Tecido não encontrado");
        }
        return tecido;
    }

    async findAllByFabrico(idFabrico: number) {
        return this.prisma.tecido.findMany({
            where: { fabrico_id: idFabrico },
            orderBy: { nome: "asc" },
        });
    }

    async update(id: number, data: UpdateTecidosDto) {
        console.log(`\n========================================`);
        console.log(`>>> [UPDATE TECIDO] Método chamado para ID: ${id}`);
        console.log(`>>> Dados recebidos:`, data);

        return this.prisma.$transaction(async (tx) => {
            const tecidoExistente = await tx.tecido.findUnique({
                where: { id },
            });

            if (!tecidoExistente) {
                console.log(`❌ [UPDATE TECIDO] Tecido ID ${id} não encontrado.`);
                throw new NotFoundException("Tecido não encontrado");
            }

            if (data.nome) {
                const nomeExistente = await tx.tecido.findFirst({
                    where: {
                        nome: data.nome,
                        fabrico_id: tecidoExistente.fabrico_id,
                        id: { not: id },
                    },
                });

                if (nomeExistente) {
                    throw new ConflictException("Tecido com esse nome já existe");
                }
            }

            const tecidoAtualizado = await tx.tecido.update({
                where: { id },
                data,
            });

            console.log(
                `🔍 Buscando produtos afetados para fabrico_id: ${tecidoExistente.fabrico_id} e tecido_id: ${id}`,
            );
            const produtosAfetados = await tx.produto.findMany({
                where: {
                    fabrico_id: tecidoExistente.fabrico_id,
                    tecido_id: id,
                },
                select: { id: true },
            });

            console.log(`📊 Total de produtos encontrados: ${produtosAfetados.length}`);

            if (produtosAfetados.length === 0) {
                console.log(
                    `⚠️ Nenhum produto vinculado a este tecido. O recálculo não será executado.`,
                );
            }

            for (const produto of produtosAfetados) {
                console.log(`🔄 Chamando recalcularCustoTotal para Produto ID: ${produto.id}...`);
                await this.produtoService.recalcularCustoTotal(produto.id, tx);
                console.log(`✅ Recálculo concluído para Produto ID: ${produto.id}`);
            }

            console.log(`========================================\n`);
            return tecidoAtualizado;
        });
    }

    async remove(id: number) {
        console.log(`\n========================================`);
        console.log(`>>> [REMOVE TECIDO] Método chamado para ID: ${id}`);

        return this.prisma.$transaction(async (tx) => {
            const tecidoExistente = await tx.tecido.findUnique({
                where: { id },
            });

            if (!tecidoExistente) {
                console.log(`❌ [REMOVE TECIDO] Tecido ID ${id} não encontrado.`);
                throw new NotFoundException("Tecido não encontrado");
            }

            const produtosAfetados = await tx.produto.findMany({
                where: {
                    fabrico_id: tecidoExistente.fabrico_id,
                    tecido_id: id,
                },
                select: { id: true },
            });

            console.log(`📊 Total de produtos que usavam este tecido: ${produtosAfetados.length}`);

            await tx.produto.updateMany({
                where: {
                    fabrico_id: tecidoExistente.fabrico_id,
                    tecido_id: id,
                },
                data: {
                    tecido_id: null,
                    quantidade_tecido: null,
                    custo_tecido: 0,
                },
            });

            for (const produto of produtosAfetados) {
                console.log(`🔄 Chamando recalcularCustoTotal para Produto ID: ${produto.id}...`);
                await this.produtoService.recalcularCustoTotal(produto.id, tx);
                console.log(`✅ Recálculo concluído para Produto ID: ${produto.id}`);
            }

            console.log(`========================================\n`);
            return tx.tecido.delete({
                where: { id },
            });
        });
    }
}
