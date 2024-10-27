import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UserService } from '../user/user.service';
import { SingupAuthDto } from './dto/singup-auth.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

  constructor(
    private userService: UserService,
    private jwtService: JwtService
  ) { }

  signup(singupAuthDto: SingupAuthDto) {
    return 'This action adds a new auth';
  }

  async login(loginAuthDto: LoginAuthDto) {
    const user = await this.userService.findOneByEmail(loginAuthDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compara la contraseña
    const passwordMatches = await this.userService.comparePasswords(loginAuthDto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      id: user.id, 
      name: user.name,
      rol: user.rol.id,
    };
    
    return {
      message: 'Login successful',
      user,
      token: await this.jwtService.signAsync(payload),
    };
  }

  user() {
    return new NotFoundException(`This action returns all auth`);
    return `This action returns all auth`;
  }

  logout() {
    return `This action returns all auth`;
  }



}
