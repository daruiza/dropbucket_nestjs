import { Inject, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UserService } from '../user/user.service';
import { SingupAuthDto } from './dto/singup-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { REQUEST } from '@nestjs/core';
import { User } from '../user/entities/user.entity';
import e from 'express';

@Injectable()
export class AuthService {

  constructor(
    @Inject(REQUEST) private request,
    private userService: UserService,
    private jwtService: JwtService
  ) { }

  signup(singupAuthDto: SingupAuthDto) {
    return 'This action adds a new auth';
  }

  async login(loginAuthDto: LoginAuthDto) {

    let user: User | undefined;
    if (loginAuthDto.email) {
      user = await this.userService.findOneByEmail(loginAuthDto.email);
      if (!user) {
        throw new UnauthorizedException('Credenciales Invalidas');
      }
    }

    if (loginAuthDto.name) {
      user = await this.userService.findOneByName(loginAuthDto.name);
      if (!user) {
        throw new UnauthorizedException('Credenciales Invalidas');
      }
    }


    // Compara la contraseña
    const passwordMatches = await this.userService.comparePasswords(loginAuthDto.password, user.password);
    if (!passwordMatches) {
      console.log(new UnauthorizedException('Credenciales Invalidas'));
      throw new UnauthorizedException('Credenciales Invalidas');
    }

    const payload = {
      id: user.id,
      rolId: user.rolId,
      prefix: user.prefix,
      name: user.name,
      email: user.email,
    };

    return {
      user,
      message: 'Inicio exitoso',
      token: await this.jwtService.signAsync(payload),
    };
  }

  user() {
    // return new NotFoundException(`This action returns all auth`);
    return this.request.user;
  }

  logout() {
    try {
      // Aquí podrías agregar lógica adicional como:
      // - Agregar el token a una lista negra
      // - Limpiar sesiones

      return {
        message: 'Cierre exitoso',
        status: true
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al cerrar sesión');
    }
  }



}
