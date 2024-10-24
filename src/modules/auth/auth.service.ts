import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAuthDto, CredentialsAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';

@Injectable()
export class AuthService {

  signup(createAuthDto: CreateAuthDto) {
    return 'This action adds a new auth';
  }

  login(loginAuthDto: LoginAuthDto) {
    return 'This action adds a new auth';
  }

  user() {
    return new NotFoundException(`This action returns all auth`);
    return `This action returns all auth`;
  }

  logout() {
    return `This action returns all auth`;
  }



}
