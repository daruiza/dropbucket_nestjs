import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class RolService {

  constructor(private prisma: PrismaService){}

  create(createRolDto: CreateRolDto) {
    return this.prisma.rol.create({data: createRolDto})
  }

  findAll() {
    return this.prisma.rol.findMany()
  }

  async findOne(id: number) {
    const rol = await this.prisma.rol.findFirst({where: {id}})

    if (!rol) {
      throw new NotFoundException(`Rol with ID ${id} not found`);
    }
    return rol;
  }

  update(id: number, updateRolDto: UpdateRolDto) {
    return `This action updates a #${id} rol`;
  }

  remove(id: number) {
    return `This action removes a #${id} rol`;
  }
}
