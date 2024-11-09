import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UserService } from '../user/user.service';
import { SingupAuthDto } from './dto/singup-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { REQUEST } from '@nestjs/core';
import { User } from '../user/entities/user.entity';

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
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    if (loginAuthDto.name) {
      user = await this.userService.findOneByName(loginAuthDto.name);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }


    // Compara la contraseña
    const passwordMatches = await this.userService.comparePasswords(loginAuthDto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = user;

    return {
      user,
      message: 'Login successful',
      token: await this.jwtService.signAsync(payload),
    };
  }

  user() {
    // return new NotFoundException(`This action returns all auth`);
    return this.request.user;
  }

  logout() {
    return `This action returns all auth`;
  }



}
