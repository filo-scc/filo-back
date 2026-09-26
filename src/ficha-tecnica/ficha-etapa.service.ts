import {
    ConflictException,
    Injectable,
    NotFoundException,
    ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateFichaEtapaDto } from "./dto/update-ficha-etapa.dto";
import { CreateFichaEtapaDto } from "./dto/create-ficha-etapa.dto";
import { FichaTecnicaService } from "./ficha-tecnica.service";
import { EtapaService } from "src/etapa/etapa.service";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "src/auth/types/authenticated-user";

@Injectable()
export class FichaEtapaService {
    constructor(
        private prisma: PrismaService,
        private readonly fichaTecnicaService: FichaTecnicaService,
        private readonly etapaService: EtapaService,
    ) {}

    private async getFichaEtapaOrFail(id: number, fabricoId: number) {
        const fichaEtapa = await this.prisma.fichaEtapa.findFirst({
            where: {
                id,
                ficha_tecnica: { fabrico_id: fabricoId },
            },
        });

        if (!fichaEtapa) {
            throw new NotFoundException("FichaEtapa não encontrada");
        }

        return fichaEtapa;
    }

    private assertMesmaFabrica(fabrico_id: number, etapa: { fabrico_id: number }) {
        if (fabrico_id !== etapa.fabrico_id) {
            throw new NotFoundException("A etapa não pertence ao mesmo fabrico da ficha técnica");
        }
    }

    private resolverFabricoId(user: AuthenticatedUser): number {
        if (user.cargo === "ADMIN") {
            throw new ForbiddenException("Administrador não pode acessar fichas-etapas");
        }

        if (!user.fabrico_id) {
            throw new ForbiddenException("Usuário não está associado a um fabrico");
        }

        return user.fabrico_id;
    }

    private assertFichaDoFabrico(ficha: { fabrico_id: number }, fabricoId: number) {
        if (ficha.fabrico_id !== fabricoId) {
            throw new NotFoundException("FichaEtapa não encontrada");
        }
    }

    async createFichaEtapa(data: CreateFichaEtapaDto, user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user);

        const [ficha, etapa] = await Promise.all([
            this.fichaTecnicaService.findOne(data.ficha_tecnica_id, fabricoId),
            this.etapaService.getById(data.etapa_id, fabricoId),
        ]);
        this.assertFichaDoFabrico(ficha, fabricoId);
        this.assertMesmaFabrica(fabricoId, etapa);

        const vinculoExiste = await this.prisma.fichaEtapa.findUnique({
            where: {
                ficha_tecnica_id_etapa_id: {
                    ficha_tecnica_id: data.ficha_tecnica_id,
                    etapa_id: data.etapa_id,
                },
            },
        });

        if (vinculoExiste) {
            throw new ConflictException("Esta etapa já está vinculada a esta ficha técnica");
        }

        try {
            return await this.prisma.$transaction(async (tx) => {
                const ultimaEtapa = await tx.etapa.findFirst({
                    where: { fabrico_id: etapa.fabrico_id, ativa: true },
                    orderBy: { ordem: "desc" },
                    select: { id: true },
                });
                const dataInicio = new Date();
                const fichaEtapa = await tx.fichaEtapa.create({
                    data: {
                        ...data,
                        data_inicio: dataInicio,
                    },
                });

                if (ultimaEtapa?.id === data.etapa_id) {
                    await tx.fichaTecnica.updateMany({
                        where: {
                            id: data.ficha_tecnica_id,
                            produzida_em: null,
                        },
                        data: {
                            produzida_em: dataInicio,
                        },
                    });
                }

                return fichaEtapa;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Ficha Etapa já cadastrada");
                }

                if (error.code === "P2003") {
                    throw new NotFoundException("Ficha Etapa não encontrado");
                }
            }

            throw error;
        }
    }

    async deleteFichaEtapa(id: number, user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user);
        await this.getFichaEtapaOrFail(id, fabricoId);
        return this.prisma.fichaEtapa.delete({ where: { id } });
    }

    async getByFichaTecnica(ficha_tecnica_id: number, user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user);
        const ficha = await this.fichaTecnicaService.findOne(ficha_tecnica_id, fabricoId);
        this.assertFichaDoFabrico(ficha, fabricoId);

        const fichasEtapas = await this.prisma.fichaEtapa.findMany({
            where: { ficha_tecnica_id },
            include: {
                etapa: true,
            },
        });

        return fichasEtapas;
    }

    async getByEtapa(etapa_id: number, user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user);

        await this.etapaService.getById(etapa_id, fabricoId);

        const fichasEtapas = await this.prisma.fichaEtapa.findMany({
            where: {
                etapa_id,
                ficha_tecnica: { fabrico_id: fabricoId },
            },
            include: {
                ficha_tecnica: true,
            },
        });

        return fichasEtapas;
    }

    async finalizarFichaEtapa(id: number, user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user);
        const fichaEtapa = await this.getFichaEtapaOrFail(id, fabricoId);

        if (fichaEtapa.data_fim) {
            return fichaEtapa;
        }

        await this.prisma.fichaEtapa.updateMany({
            where: { id, data_fim: null },
            data: { data_fim: new Date() },
        });

        return this.getFichaEtapaOrFail(id, fabricoId);
    }

    async updateFichaEtapa(id: number, data: UpdateFichaEtapaDto, user: AuthenticatedUser) {
        const fabricoId = this.resolverFabricoId(user);
        await this.getFichaEtapaOrFail(id, fabricoId);

        try {
            return await this.prisma.fichaEtapa.update({
                where: { id },
                data: {
                    observacoes: data.observacoes,
                    data_inicio: data.data_inicio,
                    data_fim: data.data_fim,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Ficha Etapa já cadastrada");
                }

                if (error.code === "P2003") {
                    throw new NotFoundException("Ficha Etapa não encontrado");
                }
            }

            throw error;
        }
    }
}
