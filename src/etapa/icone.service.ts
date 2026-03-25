import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateIconeDto } from '../etapa/dto/create-icone.dto';
import { UpdateIconeDto } from './dto/update-icone.dto';
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class IconeService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateIconeDto) {
    try {
          return await this.prisma.icone.create({
              data: {
                  ...data,
              },
          });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                throw new ConflictException("Icone já cadastrado");
            }
        }

        throw error;
    }
  }

  async getAll() {
    return this.prisma.icone.findMany();
  }

  async getById(id: number) {
      const icone = await this.prisma.icone.findUnique({
          where: { id },
      });

      if (!icone) {
          throw new NotFoundException("Icone não encontrado");
      }

      return icone;
  }

  async findOne(id: number) {
    return `This action returns a #${id} icone`;
  }

  async update(id: number, data: UpdateIconeDto) {
    await this.getById(id);
    
    try {
        return await this.prisma.icone.update({
            where: { id },
            data: {
                ...data,
            },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                throw new ConflictException("Icone já cadastrado");
            }
        }

        throw error;
    }
  }

  async delete(id: number) {
    await this.getById(id);

        return this.prisma.icone.delete({
            where: { id },
        });
  }
}
