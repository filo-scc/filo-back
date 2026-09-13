import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateFichaEtapaDto } from "./dto/update-ficha-etapa.dto";
import { CreateFichaEtapaDto } from "./dto/create-ficha-etapa.dto";
import { FichaTecnicaService } from "./ficha-tecnica.service";
import { EtapaService } from "src/etapa/etapa.service";
import { Prisma } from "@prisma/client";

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

    async createFichaEtapa(data: CreateFichaEtapaDto, fabrico_id: number) {
        const [, etapa] = await Promise.all([
            this.fichaTecnicaService.findOne(data.ficha_tecnica_id, fabrico_id),
            this.etapaService.getById(data.etapa_id),
        ]);
        this.assertMesmaFabrica(fabrico_id, etapa);

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

    async deleteFichaEtapa(id: number, fabrico_id: number) {
        await this.getFichaEtapaOrFail(id, fabrico_id);

        return this.prisma.fichaEtapa.delete({
            where: { id },
        });
    }

    async getByFichaTecnica(ficha_tecnica_id: number, fabrico_id: number) {
        await this.fichaTecnicaService.findOne(ficha_tecnica_id, fabrico_id);

        const fichasEtapas = await this.prisma.fichaEtapa.findMany({
            where: { ficha_tecnica_id },
            include: {
                etapa: true,
            },
        });

        return fichasEtapas;
    }

    async getByEtapa(etapa_id: number, fabrico_id: number) {
        const etapa = await this.etapaService.getById(etapa_id);
        this.assertMesmaFabrica(fabrico_id, etapa);

        const fichasEtapas = await this.prisma.fichaEtapa.findMany({
            where: { etapa_id, ficha_tecnica: { fabrico_id: fabrico_id } },
            include: {
                ficha_tecnica: true,
            },
        });

        return fichasEtapas;
    }

    async finalizarFichaEtapa(id: number, fabrico_id: number) {
        const fichaEtapa = await this.getFichaEtapaOrFail(id, fabrico_id);

        if (fichaEtapa.data_fim) {
            return fichaEtapa;
        }

        await this.prisma.fichaEtapa.updateMany({
            where: { id, data_fim: null },
            data: { data_fim: new Date() },
        });

        return this.getFichaEtapaOrFail(id, fabrico_id);
    }

    async updateFichaEtapa(id: number, data: UpdateFichaEtapaDto, fabrico_id: number) {
        await this.getFichaEtapaOrFail(id, fabrico_id);

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
