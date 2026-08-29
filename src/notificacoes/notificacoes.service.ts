import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateNotificacaoDto } from "./dto/create-notificacao.dto";
import { UpdateNotificacaoDto } from "./dto/update-notificacao.dto";

const destinatariosInclude = {
    destinatarios: {
        include: {
            usuario: {
                select: {
                    id: true,
                    nome: true,
                    email: true,
                },
            },
        },
    },
} satisfies Prisma.NotificacaoInclude;

@Injectable()
export class NotificacoesService {
    constructor(private readonly prisma: PrismaService) {}

    private assertFabricoAccess(fabrico_id: number, usuario_fabrico_id: number) {
        if (fabrico_id !== usuario_fabrico_id) {
            throw new NotFoundException("Fabrico não encontrado");
        }
    }

    private async assertDestinatariosDoFabrico(destinatario_ids: number[], fabrico_id: number) {
        const uniqueIds = [...new Set(destinatario_ids)];

        if (uniqueIds.length !== destinatario_ids.length) {
            throw new BadRequestException("Destinatários duplicados não são permitidos");
        }

        const usuarios = await this.prisma.usuario.findMany({
            where: {
                id: { in: uniqueIds },
                fabrico_id,
            },
            select: { id: true },
        });

        if (usuarios.length !== uniqueIds.length) {
            throw new BadRequestException(
                "Um ou mais destinatários não pertencem a este fabrico",
            );
        }
    }

    async create(data: CreateNotificacaoDto, usuario_fabrico_id: number) {
        this.assertFabricoAccess(data.fabrico_id, usuario_fabrico_id);

        const fabrico = await this.prisma.fabrico.findUnique({
            where: { id: data.fabrico_id },
        });

        if (!fabrico) {
            throw new NotFoundException("Fabrico não encontrado");
        }

        if (data.destinatario_ids?.length) {
            await this.assertDestinatariosDoFabrico(data.destinatario_ids, data.fabrico_id);
        }

        try {
            const notificacao = await this.prisma.notificacao.create({
                data: {
                    fabrico_id: data.fabrico_id,
                    tipo: data.tipo,
                    categoria: data.categoria,
                    severidade: data.severidade,
                    fonte: data.fonte,
                    titulo: data.titulo,
                    mensagem: data.mensagem,
                    metadados: data.metadados as Prisma.InputJsonValue | undefined,
                    entidade_tipo: data.entidade_tipo,
                    entidade_id: data.entidade_id,
                    acao_url: data.acao_url,
                    chave_deduplicacao: data.chave_deduplicacao,
                    ocorreu_em: data.ocorreu_em ? new Date(data.ocorreu_em) : undefined,
                    expira_em: data.expira_em ? new Date(data.expira_em) : undefined,
                    destinatarios: data.destinatario_ids?.length
                        ? {
                              create: data.destinatario_ids.map((usuario_id) => ({
                                  usuario_id,
                              })),
                          }
                        : undefined,
                },
                include: destinatariosInclude,
            });

            return {
                message: "Notificação criada com sucesso",
                data: notificacao,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2003") {
                    throw new BadRequestException("Destinatário ou referência inválida");
                }
                if (error.code === "P2002") {
                    throw new BadRequestException("Destinatários duplicados não são permitidos");
                }
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async findAll(usuario_fabrico_id: number) {
        return this.prisma.notificacao.findMany({
            where: { fabrico_id: usuario_fabrico_id },
            include: destinatariosInclude,
            orderBy: { ocorreu_em: "desc" },
        });
    }

    async findMine(usuario_id: number, usuario_fabrico_id: number) {
        const notificacoes = await this.prisma.notificacao.findMany({
            where: {
                fabrico_id: usuario_fabrico_id,
                destinatarios: { some: { usuario_id } },
            },
            include: {
                destinatarios: {
                    where: { usuario_id },
                    select: { lida_em: true },
                },
            },
            orderBy: { ocorreu_em: "desc" },
        });

        return notificacoes.map(({ destinatarios, ...notificacao }) => ({
            ...notificacao,
            lida: destinatarios[0]?.lida_em != null,
            lida_em: destinatarios[0]?.lida_em ?? null,
        }));
    }

    async marcarComoLida(notificacao_id: number, usuario_id: number, usuario_fabrico_id: number) {
        const destinatario = await this.prisma.notificacaoDestinatario.findUnique({
            where: {
                notificacao_id_usuario_id: { notificacao_id, usuario_id },
            },
            include: {
                notificacao: {
                    select: { fabrico_id: true },
                },
            },
        });

        if (!destinatario || destinatario.notificacao.fabrico_id !== usuario_fabrico_id) {
            throw new NotFoundException("Notificação não encontrada");
        }

        const atualizado = await this.prisma.notificacaoDestinatario.update({
            where: { id: destinatario.id },
            data: { lida_em: destinatario.lida_em ?? new Date() },
            include: { notificacao: true },
        });

        return {
            message: "Notificação marcada como lida",
            data: atualizado,
        };
    }

    async findOne(id: number, usuario_fabrico_id: number) {
        const notificacao = await this.prisma.notificacao.findFirst({
            where: { id, fabrico_id: usuario_fabrico_id },
            include: destinatariosInclude,
        });

        if (!notificacao) {
            throw new NotFoundException("Notificação não encontrada");
        }

        return notificacao;
    }

    async update(id: number, data: UpdateNotificacaoDto, usuario_fabrico_id: number) {
        await this.findOne(id, usuario_fabrico_id);

        const { destinatario_ids, ocorreu_em, expira_em, metadados, fabrico_id, ...rest } = data;

        if (fabrico_id !== undefined) {
            this.assertFabricoAccess(fabrico_id, usuario_fabrico_id);
        }

        if (destinatario_ids?.length) {
            await this.assertDestinatariosDoFabrico(destinatario_ids, usuario_fabrico_id);
        }

        try {
            const notificacao = await this.prisma.notificacao.update({
                where: { id },
                data: {
                    ...rest,
                    metadados: metadados as Prisma.InputJsonValue | undefined,
                    ocorreu_em: ocorreu_em ? new Date(ocorreu_em) : undefined,
                    expira_em: expira_em ? new Date(expira_em) : undefined,
                    ...(destinatario_ids
                        ? {
                              destinatarios: {
                                  deleteMany: {},
                                  create: destinatario_ids.map((usuario_id) => ({
                                      usuario_id,
                                  })),
                              },
                          }
                        : {}),
                },
                include: destinatariosInclude,
            });

            return {
                message: "Notificação atualizada com sucesso",
                data: notificacao,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2003") {
                    throw new BadRequestException("Destinatário ou referência inválida");
                }
                if (error.code === "P2002") {
                    throw new BadRequestException("Destinatários duplicados não são permitidos");
                }
            }
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Dados inválidos");
            }
            throw error;
        }
    }

    async remove(id: number, usuario_fabrico_id: number) {
        await this.findOne(id, usuario_fabrico_id);

        try {
            const notificacao = await this.prisma.notificacao.delete({
                where: { id },
            });

            return {
                message: "Notificação removida com sucesso",
                data: notificacao,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            throw error;
        }
    }
}
