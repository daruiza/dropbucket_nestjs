import { Module } from '@nestjs/common';
import { RolService } from './rol.service';
import { RolController } from './rol.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [RolController],
  providers: [RolService, PrismaService],
})
export class RolModule {}
