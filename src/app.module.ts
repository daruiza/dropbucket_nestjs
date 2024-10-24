import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RolModule } from './modules/rol/rol.module';

@Module({
  imports: [AuthModule, UserModule, RolModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
