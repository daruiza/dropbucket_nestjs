import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Header } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags } from '@nestjs/swagger';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SingupAuthDto } from './dto/singup-auth.dto';
import { AuthGuard } from './guards/auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('signup')
  signup(@Body() singupAuthDto: SingupAuthDto) {
    return this.authService.signup(singupAuthDto);
  }

  @Post('login')
  @Header('Content-Type', 'application/json; charset=utf-8')
  login(@Body() loginAuthDto: LoginAuthDto) {
    return this.authService.login(loginAuthDto);
  }

  @Get('user')
  @Header('Content-Type', 'application/json; charset=utf-8')
  @UseGuards(AuthGuard)
  user() {
    return this.authService.user();
  }

  @Get('logout')
  @Header('Content-Type', 'application/json; charset=utf-8')
  logout() {
    return this.authService.user();
  }


}
