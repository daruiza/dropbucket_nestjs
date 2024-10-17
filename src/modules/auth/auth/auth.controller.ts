import { Controller, Get, Post } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Controller('auth')
export class AuthController {

    private authService;
    
    constructor(private AuthService: AuthService){
        this.authService = AuthService;
    }

    @Post('/login')
    login(){
        return {token: 'un token'}
    }

    @Get('/logout')
    logout(){
        return {token: null}
    }

    @Get('/user')
    getUser() {
        return this.authService.getUser();
    }
}
