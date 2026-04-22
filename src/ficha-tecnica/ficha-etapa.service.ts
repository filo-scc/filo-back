import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
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

    async createFichaEtapa(data: CreateFichaEtapaDto) {
        await Promise.all([
            this.fichaTecnicaService.findOne(data.ficha_tecnica_id),
            this.etapaService.getById(data.etapa_id),
        ]);

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
            return await this.prisma.fichaEtapa.create({
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

    async deleteFichaEtapa(id: number) {
        const fichaEtapa = await this.prisma.fichaEtapa.findUnique({
            where: { id },
        });

        if (!fichaEtapa) {
            throw new NotFoundException("FichaEtapa não encontrada");
        }

        return this.prisma.fichaEtapa.delete({
            where: { id },
        });
    }

    async getByFichaTecnica(ficha_tecnica_id: number) {
        await this.fichaTecnicaService.findOne(ficha_tecnica_id);

        const fichasEtapas = await this.prisma.fichaEtapa.findMany({
            where: { ficha_tecnica_id },
            include: {
                etapa: true,
            },
        });

        return fichasEtapas;
    }

    async getByEtapa(etapa_id: number) {
        await this.etapaService.getById(etapa_id);

        const fichasEtapas = await this.prisma.fichaEtapa.findMany({
            where: { etapa_id },
            include: {
                ficha_tecnica: true,
            },
        });

        return fichasEtapas;
    }

    async updateFichaEtapa(id: number, data: UpdateFichaEtapaDto) {
        const atual = await this.prisma.fichaEtapa.findUnique({
            where: { id },
        });

        if (!atual) {
            throw new NotFoundException("FichaEtapa não encontrada");
        }

        if (data.ficha_tecnica_id) {
            await this.fichaTecnicaService.findOne(data.ficha_tecnica_id);
        }

        if (data.etapa_id) {
            await this.etapaService.getById(data.etapa_id);
        }

        const ficha_tecnica_id = data.ficha_tecnica_id ?? atual.ficha_tecnica_id;
        const etapa_id = data.etapa_id ?? atual.etapa_id;

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
