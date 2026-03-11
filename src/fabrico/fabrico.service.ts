import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFabricoDto } from './dto/create-fabrico.dto';

@Injectable()
export class FabricoService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateFabricoDto) {
    return this.prisma.fabrico.create({
      data: {
        foto_de_perfil: data.foto_de_perfil,
        cnpj: data.cnpj,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
      },
    });
  }
}
