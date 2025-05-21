import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RolModule } from './modules/rol/rol.module';
import { BucketModule } from './modules/bucket/bucket.module';
import { LoggerMiddleware } from './modules/user/middleware/logger/logger.middleware';

@Module({
  imports: [AuthModule, UserModule, RolModule, BucketModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
          .apply(LoggerMiddleware)
          .forRoutes(
            { path: '*', method: RequestMethod.ALL },    
          )
  }
}
