import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { LoggerMiddleware } from './middleware/logger/logger.middleware';
import { AuthMiddleware } from '../auth/middleware/auth/auth.middleware';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService],
})
export class UserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // consumer
    //   .apply(LoggerMiddleware)
    //   .forRoutes(
    //     { path: 'user', method: RequestMethod.GET },
    //     { path: 'user', method: RequestMethod.POST },
    //   ).apply(AuthMiddleware).forRoutes('user')
  }

}
