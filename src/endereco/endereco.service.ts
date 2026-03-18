import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEnderecoDto } from './dto/create-endereco.dto';
import { UpdateEnderecoDto } from './dto/update-endereco.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnderecoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEnderecoDto: CreateEnderecoDto) {
    const { ...dados } = createEnderecoDto;

    return this.prisma.endereco.create({
      data: {
        ...dados,
        usuario_id: dados.usuario_id ? Number(dados.usuario_id) : null,
        faccao_id: dados.faccao_id ? Number(dados.faccao_id) : null,
      },
    });
  }

  async update(id: number, updateEnderecoDto: UpdateEnderecoDto) {
    await this.findById(id);

    const { ...dados } = updateEnderecoDto;

    return this.prisma.endereco.update({
      where: { id },
      data: {
        ...dados,
        usuario_id: dados.usuario_id ? Number(dados.usuario_id) : undefined,
        faccao_id: dados.faccao_id ? Number(dados.faccao_id) : undefined,
      },
    });
  }

  async findAll() {
    return this.prisma.endereco.findMany();
  }
  
  async findById(id: number) {
    const endereco = await this.prisma.endereco.findUnique({
      where: { id },
    });

    if (!endereco) throw new NotFoundException(`Endereço ${id} não encontrado.`);
    return endereco;
  }

  async findByUsuarioId(usuario_id: number) {
    const endereco = await this.prisma.endereco.findUnique({
      where: { usuario_id },
    });

    if (!endereco) throw new NotFoundException(`Endereço para o usuário ${usuario_id} não encontrado.`);
    return endereco;
  }

  async findByFaccaoId(faccao_id: number) {
    const endereco = await this.prisma.endereco.findUnique({
      where: { faccao_id },
    });

    if (!endereco) throw new NotFoundException(`Endereço para a facção ${faccao_id} não encontrado.`);
    return endereco;
  }
}