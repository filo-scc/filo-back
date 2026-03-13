import { Injectable } from '@nestjs/common';
import { CreateFaccaoDto } from './dto/create-faccao.dto';
import { UpdateFaccaoDto } from './dto/update-faccao.dto';

@Injectable()
export class FaccaoService {
  create(createFaccaoDto: CreateFaccaoDto) {
    return 'This action adds a new faccao';
  }

  findAll() {
    return `This action returns all faccao`;
  }

  findOne(id: number) {
    return `This action returns a #${id} faccao`;
  }

  update(id: number, updateFaccaoDto: UpdateFaccaoDto) {
    return `This action updates a #${id} faccao`;
  }

  remove(id: number) {
    return `This action removes a #${id} faccao`;
  }
}
