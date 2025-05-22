import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Header } from '@nestjs/common';
import { RolService } from './rol.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';


@ApiBearerAuth()
@ApiTags('user')
@UseGuards(AuthGuard)
@Controller('rol')
export class RolController {
  constructor(private readonly rolService: RolService) {}
  
  @Get()
  @Header('Content-Type', 'application/json; charset=utf-8')
  findAll() {
    return this.rolService.findAll();
  }

  @Post()
  @Header('Content-Type', 'application/json; charset=utf-8')
  create(@Body() createRolDto: CreateRolDto) {
    return this.rolService.create(createRolDto);
  }

  @Get(':id')
  @Header('Content-Type', 'application/json; charset=utf-8')
  findOne(@Param('id') id: string) {
    return this.rolService.findOne(+id);
  }

  @Patch(':id')
  @Header('Content-Type', 'application/json; charset=utf-8')
  update(@Param('id') id: string, @Body() updateRolDto: UpdateRolDto) {
    return this.rolService.update(+id, updateRolDto);
  }

  @Delete(':id')
  @Header('Content-Type', 'application/json; charset=utf-8')
  remove(@Param('id') id: string) {
    return this.rolService.remove(+id);
  }
}
