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

  async update(id: number, updateRolDto: UpdateRolDto) {
    const user = await this.prisma.rol.findUnique({ where: { id: id } });
    if (!user) {
      throw new NotFoundException(`Rol with ID ${id} not found`);
    }

    // Actualiza el usuario
    return this.prisma.rol.update({
      where: { id },
      data: updateRolDto,
    });
  }

  async remove(id: number) {
    const user = await this.prisma.rol.findUnique({ where: { id: id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.prisma.rol.delete({ where: { id: id } })
  }
}
