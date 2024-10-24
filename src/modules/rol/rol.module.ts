import { Module } from '@nestjs/common';
import { RolService } from './rol.service';
import { RolController } from './rol.controller';

@Module({
  controllers: [RolController],
  providers: [RolService],
})
export class RolModule {}
