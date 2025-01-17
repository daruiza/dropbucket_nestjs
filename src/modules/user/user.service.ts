import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma.service';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Rol } from '../rol/entities/rol.entity';


@Injectable()
export class UserService {

  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { name: createUserDto.name },
          { email: createUserDto.email }
        ]
      }
    })
    if (user) {
      throw new BadRequestException(`User is found`);
    }
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword
      }
    })
  }

  async findAll(skip: number = 0, take: number = 45): Promise<User[] | undefined> {
    return this.prisma.user.findMany({
      skip: skip,
      take: take,
      include: {
        rol: {
          include: {
            optionrols: {
              include: {
                option: true
              }
            }
          }
        }
      }
    })
  }

  async findOne(id: number): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
      include: {
        rol: {
          include: {
            optionrols: {
              include: {
                option: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneByName(name: string): Promise<User | undefined> {
    const user = await this.prisma.user.findFirst({
      where: { name: name },
      include: {
        rol: {
          include: {
            optionrols: {
              include: {
                option: true
              }
            }
          }
        }
      }
    });
    if (!user) {
      throw new NotFoundException(`User with Name: ${name} not found`);
    }
    return user;
  }

  async findOneByEmail(email: string): Promise<User | any> {
    const user = await this.prisma.user.findFirst({
      where: { email: email },
      include: {
        rol: {
          include: {
            optionrols: {
              include: {
                option: true
              }
            }
          }
        }
      }
    });
    if (!user) {
      throw new NotFoundException(`User with Email: ${email} not found`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.password && updateUserDto.password != null && updateUserDto.password != '') {
      // Encripta la nueva contraseña si se proporciona
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Actualiza el usuario
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id: id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.prisma.user.delete({ where: { id: id } })
  }

  async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
