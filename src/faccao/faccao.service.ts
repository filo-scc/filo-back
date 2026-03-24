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
            return await this.prisma.faccao.findMany({
                include: {
                    endereco: true,
                    faccao_produto: { include: { produto: true } },
                },
            });
        } catch (error) {
            console.error("Erro ao buscar facções:", error);
            throw new NotFoundException("Nenhuma facção encontrada");
        }
    }

    async getAllFaccaoByFabrico(id: number) {
        const faccoes = await this.prisma.faccao.findMany({
            where: { fabrico_id: id },
            include: { endereco: true },
        });

        return faccoes;
    }

    async getById(id: number) {
        const faccao = await this.prisma.faccao.findUnique({
            where: { id },
            include: {
                endereco: true,
                faccao_produto: { include: { produto: true } },
            },
        });

        if (!faccao) {
            throw new NotFoundException("Facção não encontrada!");
        }

        return faccao;
    }

    async create(data: CreateFaccaoDto) {
        const { endereco, produtos, ...dadosFaccao } = data;
        const existente = await this.prisma.faccao.findFirst({
            where: {
                nome: dadosFaccao.nome,
                fabrico_id: dadosFaccao.fabrico_id,
            },
        });

        if (existente) {
            throw new ConflictException("Já existe uma facção com esse nome nesse fabrico");
        }

        if (produtos && produtos.length > 0) {
            const produtosIds = produtos.map((p) => p.produto_id);
            const produtosBd = await this.prisma.produto.findMany({
                where: { id: { in: produtosIds } },
            });

            const produtosInvalidos = produtosBd.filter(
                (p) => p.fabrico_id !== dadosFaccao.fabrico_id,
            );
            if (produtosInvalidos.length > 0 || produtosBd.length !== produtos.length) {
                throw new ConflictException(
                    "Todos os produtos devem pertencer ao mesmo fabrico da facção e existir no sistema",
                );
            }
        }

        await this.prisma.faccao.create({
            data: {
                ...dadosFaccao,
                telefone: dadosFaccao.telefone ?? null,

                endereco: endereco
                    ? {
                          create: {
                              rua: endereco.rua,
                              numero: endereco.numero,
                              bairro: endereco.bairro,
                              cidade: endereco.cidade,
                              estado: endereco.estado,
                              complemento: endereco.complemento,
                          },
                      }
                    : undefined,
                faccao_produto: produtos
                    ? {
                          create: produtos.map((p) => ({
                              produto_id: p.produto_id,
                              preco: p.preco,
                          })),
                      }
                    : undefined,
            },
            include: { endereco: true },
        });

        return { message: "Facção criada com sucesso" };
    }

    async update(id: number, data: UpdateFaccaoDto) {
        const { endereco, produtos, ...dadosFaccao } = data;

        const faccaoAtual = await this.getById(id);
        const fabricoChecar = dadosFaccao.fabrico_id || faccaoAtual.fabrico_id;

        if (dadosFaccao.nome || dadosFaccao.fabrico_id) {
            const nomeChecar = dadosFaccao.nome || faccaoAtual.nome;
            const existente = await this.prisma.faccao.findFirst({
                where: {
                    nome: nomeChecar,
                    fabrico_id: fabricoChecar,
                    id: { not: id },
                },
            });

            if (existente) {
                throw new ConflictException("Já existe uma facção com esse nome nesse fabrico");
            }
        }

        if (produtos && produtos.length > 0) {
            const produtosIds = produtos.map((p) => p.produto_id);
            const produtosBd = await this.prisma.produto.findMany({
                where: { id: { in: produtosIds } },
            });

            const produtosInvalidos = produtosBd.filter((p) => p.fabrico_id !== fabricoChecar);
            if (produtosInvalidos.length > 0) {
                throw new ConflictException(
                    "Todos os produtos enviados devem pertencer ao mesmo fabrico da facção",
                );
            }
        }

        await this.prisma.faccao.update({
            where: { id },
            data: {
                ...dadosFaccao,
                endereco: endereco
                    ? {
                          upsert: {
                              create: { ...endereco },
                              update: { ...endereco },
                          },
                      }
                    : undefined,
            },
        });

        if (produtos) {
            const produtosIdsQueFicam = produtos.map((p) => p.produto_id);

            await this.prisma.faccaoProduto.deleteMany({
                where: {
                    faccao_id: id,
                    produto_id: { notIn: produtosIdsQueFicam },
                },
            });

            for (const p of produtos) {
                await this.prisma.faccaoProduto.upsert({
                    where: {
                        produto_id_faccao_id: { faccao_id: id, produto_id: p.produto_id },
                    },
                    update: { preco: p.preco },
                    create: {
                        faccao_id: id,
                        produto_id: p.produto_id,
                        preco: p.preco,
                    },
                });
            }
        }

        return { message: "Facção atualizada com sucesso" };
    }

    async delete(id: number) {
        const faccao = await this.getById(id);

        if (!faccao) {
            throw new NotFoundException("Facção não encontrada");
        }

        await this.prisma.faccao.delete({
            where: { id },
        });

        return { message: "Facção foi removida com sucesso" };
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
