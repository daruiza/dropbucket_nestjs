import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RolModule } from './modules/rol/rol.module';
import { BucketModule } from './modules/bucket/bucket.module';

@Module({
  imports: [AuthModule, UserModule, RolModule, BucketModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
