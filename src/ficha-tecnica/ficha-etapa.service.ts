import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
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

    private assertMesmaFabrica(ficha: { fabrico_id: number }, etapa: { fabrico_id: number }) {
        if (ficha.fabrico_id !== etapa.fabrico_id) {
            throw new BadRequestException("A etapa não pertence ao mesmo fabrico da ficha técnica");
        }
    }

    private assertFichaDoFabrico(ficha: { fabrico_id: number }, fabricoId?: number) {
        if (fabricoId !== undefined && ficha.fabrico_id !== fabricoId) {
            throw new NotFoundException("FichaEtapa não encontrada");
        }
    }

    async createFichaEtapa(data: CreateFichaEtapaDto, fabricoId?: number) {
        const [ficha, etapa] = await Promise.all([
            this.fichaTecnicaService.findOne(data.ficha_tecnica_id),
            fabricoId !== undefined
                ? this.etapaService.getById(data.etapa_id, fabricoId)
                : this.etapaService.getById(data.etapa_id),
        ]);
        this.assertFichaDoFabrico(ficha, fabricoId);
        this.assertMesmaFabrica(ficha, etapa);

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

    async deleteFichaEtapa(id: number, fabricoId?: number) {
        const fichaEtapa = await this.prisma.fichaEtapa.findUnique({
            where: { id },
            include: {
                ficha_tecnica: {
                    select: { fabrico_id: true },
                },
            },
        });

        if (
            !fichaEtapa ||
            (fabricoId !== undefined && fichaEtapa.ficha_tecnica?.fabrico_id !== fabricoId)
        ) {
            throw new NotFoundException("FichaEtapa não encontrada");
        }

        return this.prisma.fichaEtapa.delete({
            where: { id },
        });
    }

    async getByFichaTecnica(ficha_tecnica_id: number, fabricoId?: number) {
        const ficha = await this.fichaTecnicaService.findOne(ficha_tecnica_id);
        this.assertFichaDoFabrico(ficha, fabricoId);

        const fichasEtapas = await this.prisma.fichaEtapa.findMany({
            where: { ficha_tecnica_id },
            include: {
                etapa: true,
            },
        });

        return fichasEtapas;
    }

    async getByEtapa(etapa_id: number, fabricoId?: number) {
        if (fabricoId !== undefined) {
            await this.etapaService.getById(etapa_id, fabricoId);
        } else {
            await this.etapaService.getById(etapa_id);
        }

        const fichasEtapas = await this.prisma.fichaEtapa.findMany({
            where:
                fabricoId !== undefined
                    ? {
                          etapa_id,
                          ficha_tecnica: { fabrico_id: fabricoId },
                      }
                    : { etapa_id },
            include: {
                ficha_tecnica: true,
            },
        });

        return fichasEtapas;
    }

    async finalizarFichaEtapa(id: number, fabricoId?: number) {
        const fichaEtapa = await this.prisma.fichaEtapa.findUnique({
            where: { id },
            include: {
                ficha_tecnica: {
                    select: { fabrico_id: true },
                },
            },
        });

        if (
            !fichaEtapa ||
            (fabricoId !== undefined && fichaEtapa.ficha_tecnica?.fabrico_id !== fabricoId)
        ) {
            throw new NotFoundException("FichaEtapa não encontrada");
        }

        if (fichaEtapa.data_fim) {
            return fichaEtapa;
        }

        await this.prisma.fichaEtapa.updateMany({
            where: { id, data_fim: null },
            data: { data_fim: new Date() },
        });

        const fichaEtapaFinalizada = await this.prisma.fichaEtapa.findUnique({
            where: { id },
        });

        if (!fichaEtapaFinalizada) {
            throw new NotFoundException("FichaEtapa não encontrada");
        }

        return fichaEtapaFinalizada;
    }

    async updateFichaEtapa(id: number, data: UpdateFichaEtapaDto, fabricoId?: number) {
        const atual = await this.prisma.fichaEtapa.findUnique({
            where: { id },
            include: {
                ficha_tecnica: {
                    select: { fabrico_id: true },
                },
            },
        });

        if (!atual || (fabricoId !== undefined && atual.ficha_tecnica?.fabrico_id !== fabricoId)) {
            throw new NotFoundException("FichaEtapa não encontrada");
        }

        const ficha_tecnica_id = data.ficha_tecnica_id ?? atual.ficha_tecnica_id;
        const etapa_id = data.etapa_id ?? atual.etapa_id;
        const [ficha, etapa] = await Promise.all([
            this.fichaTecnicaService.findOne(ficha_tecnica_id),
            fabricoId !== undefined
                ? this.etapaService.getById(etapa_id, fabricoId)
                : this.etapaService.getById(etapa_id),
        ]);
        this.assertFichaDoFabrico(ficha, fabricoId);
        this.assertMesmaFabrica(ficha, etapa);

        const vinculoExiste = await this.prisma.fichaEtapa.findFirst({
            where: {
                ficha_tecnica_id,
                etapa_id,
                NOT: { id },
            },
        });

        if (vinculoExiste) {
            throw new ConflictException("Esta etapa já está vinculada a esta ficha técnica");
        }

        try {
            return this.prisma.fichaEtapa.update({
                where: { id },
                data: {
                    ...data,
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
