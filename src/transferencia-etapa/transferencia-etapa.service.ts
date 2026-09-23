import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { TransferirEtapaDto } from "./dto/transferir-etapa.dto";

@Injectable()
export class TransferenciaEtapaService {
    constructor(private readonly prisma: PrismaService) {}

    async transferir(dto: TransferirEtapaDto, fabricoId: number) {
        const {
            ficha_tecnica_id,
            etapa_origem_id,
            etapa_destino_id,
            relatorio,
            parceiros = [],
        } = dto;

        if (relatorio) {
            const totalPerdas =
                relatorio.defeitos_costura +
                relatorio.defeitos_tecido +
                relatorio.retiradas +
                relatorio.sobras;
            if (totalPerdas > relatorio.quantidade) {
                throw new BadRequestException(
                    "A soma das perdas não pode ser maior que a quantidade da ficha técnica",
                );
            }
        }

        return this.prisma.$transaction(
            async (tx) => {
                await tx.$queryRaw`SELECT id FROM "fichas-tecnicas" WHERE id = ${ficha_tecnica_id} FOR UPDATE`;

                const ficha = await tx.fichaTecnica.findFirst({
                    where: { id: ficha_tecnica_id, fabrico_id: fabricoId },
                });
                if (!ficha) {
                    throw new NotFoundException("Ficha técnica não encontrada");
                }

                if (ficha.concluida) {
                    throw new BadRequestException(
                        "Não é possível transferir etapa de uma ficha técnica já concluída",
                    );
                }

                // Se já está na etapa destino não repete nada
                if (ficha.etapa_atual_id === etapa_destino_id) {
                    return tx.fichaTecnica.findUnique({
                        where: { id: ficha_tecnica_id },
                        include: {
                            fichas_etapas: true,
                            etapa_atual: true,
                            ficha_parceiro: { include: { parceiro: true } },
                        },
                    });
                }

                // A origem informada precisa bater com a etapa atual real da ficha.
                if (ficha.etapa_atual_id !== etapa_origem_id) {
                    throw new BadRequestException(
                        "A etapa de origem informada não corresponde à etapa atual da ficha técnica",
                    );
                }

                const [etapaOrigem, etapaDestino] = await Promise.all([
                    tx.etapa.findFirst({ where: { id: etapa_origem_id, fabrico_id: fabricoId } }),
                    tx.etapa.findFirst({ where: { id: etapa_destino_id, fabrico_id: fabricoId } }),
                ]);

                if (!etapaOrigem || !etapaDestino) {
                    throw new BadRequestException(
                        "A etapa não pertence ao mesmo fabrico da ficha técnica",
                    );
                }

                if (!etapaDestino.ativa) {
                    throw new BadRequestException("A etapa de destino está inativa");
                }

                if (etapaDestino.ordem <= etapaOrigem.ordem) {
                    throw new BadRequestException(
                        "Não é permitido retornar para etapas anteriores",
                    );
                }

                // 1. Finaliza a etapa anterior (só age se ainda estiver aberta)
                const fichaEtapaAberta = await tx.fichaEtapa.findFirst({
                    where: { ficha_tecnica_id, etapa_id: etapa_origem_id, data_fim: null },
                });

                if (!fichaEtapaAberta) {
                    throw new BadRequestException(
                        "Não foi encontrada uma etapa em andamento correspondente à ficha técnica",
                    );
                }

                await tx.fichaEtapa.update({
                    where: { id: fichaEtapaAberta.id },
                    data: { data_fim: new Date() },
                });

                // 2. Abre a nova etapa
                const dataInicio = new Date();
                let fichaEtapaDestino = await tx.fichaEtapa.findUnique({
                    where: {
                        ficha_tecnica_id_etapa_id: { ficha_tecnica_id, etapa_id: etapa_destino_id },
                    },
                });

                if (!fichaEtapaDestino) {
                    try {
                        fichaEtapaDestino = await tx.fichaEtapa.create({
                            data: {
                                ficha_tecnica_id,
                                etapa_id: etapa_destino_id,
                                data_inicio: dataInicio,
                            },
                        });
                    } catch (error) {
                        if (
                            error instanceof Prisma.PrismaClientKnownRequestError &&
                            error.code === "P2002"
                        ) {
                            // Corrida: outra transação criou entre o findUnique e o create.
                            fichaEtapaDestino = await tx.fichaEtapa.findUniqueOrThrow({
                                where: {
                                    ficha_tecnica_id_etapa_id: {
                                        ficha_tecnica_id,
                                        etapa_id: etapa_destino_id,
                                    },
                                },
                            });
                        } else {
                            throw error;
                        }
                    }
                }

                // 3. Se a etapa detino eh a ultima etapa ativa do fabrico
                const ultimaEtapaAtiva = await tx.etapa.findFirst({
                    where: { fabrico_id: fabricoId, ativa: true },
                    orderBy: { ordem: "desc" },
                    select: { id: true },
                });
                if (ultimaEtapaAtiva?.id === etapa_destino_id) {
                    await tx.fichaTecnica.updateMany({
                        where: { id: ficha_tecnica_id, produzida_em: null },
                        data: { produzida_em: dataInicio },
                    });
                }

                // 4. Vínculos: ParceiroProduto (preco) + FichaTecnicaParceiro (valor/quantidade)
                for (const p of parceiros) {
                    const parceiro = await tx.parceiro.findFirst({
                        where: { id: p.parceiro_id, fabrico_id: fabricoId },
                    });
                    if (!parceiro) {
                        throw new NotFoundException(
                            `Parceiro ${p.parceiro_id} não encontrado para este fabrico`,
                        );
                    }

                    await tx.parceiroProduto.upsert({
                        where: {
                            produto_id_parceiro_id: {
                                produto_id: ficha.produto_id,
                                parceiro_id: p.parceiro_id,
                            },
                        },
                        create: {
                            produto_id: ficha.produto_id,
                            parceiro_id: p.parceiro_id,
                            preco: p.preco,
                        },
                        update: { preco: p.preco },
                    });

                    const parceiroUnico = parceiros.length === 1;
                    const quantidadeEfetiva = parceiroUnico
                        ? (relatorio?.quantidade ?? ficha.quantidade)
                        : (p.quantidade ?? 0);
                    const valor = parceiroUnico
                        ? Number((quantidadeEfetiva * p.preco).toFixed(2))
                        : undefined;

                    await tx.fichaParceiro.upsert({
                        where: {
                            ficha_id_parceiro_id: {
                                ficha_id: ficha_tecnica_id,
                                parceiro_id: p.parceiro_id,
                            },
                        },
                        create: {
                            ficha_id: ficha_tecnica_id,
                            parceiro_id: p.parceiro_id,
                            operacao: p.operacao ?? null,
                            quantidade: quantidadeEfetiva,
                            valor,
                        },
                        update: {
                            operacao: p.operacao ?? null,
                            quantidade: quantidadeEfetiva,
                            valor,
                        },
                    });
                }

                // 5. Atualiza a etapa atual da ficha (+ relatório de acabamento, se enviado)
                return tx.fichaTecnica.update({
                    where: { id: ficha_tecnica_id },
                    data: {
                        etapa_atual_id: etapa_destino_id,
                        ...(relatorio
                            ? {
                                  quantidade: relatorio.quantidade,
                                  defeitos_costura: relatorio.defeitos_costura,
                                  defeitos_tecido: relatorio.defeitos_tecido,
                                  retiradas: relatorio.retiradas,
                                  sobras: relatorio.sobras,
                              }
                            : {}),
                    },
                    include: {
                        fichas_etapas: true,
                        etapa_atual: true,
                        ficha_parceiro: { include: { parceiro: true } },
                    },
                });
            },
            { maxWait: 15000, timeout: 30000 },
        );
    }
}
