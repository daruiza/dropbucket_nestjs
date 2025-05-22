import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Query, Header } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ValidateCreatePipe } from './pipes/validate-create/validate-create.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiBearerAuth()
@ApiTags('user')
@UseGuards(AuthGuard)
@Controller('user')
export class UserController {

  // @Body(),@Param(),@Query()

  constructor(private readonly userService: UserService) { }

  @Post()
  @Header('Content-Type', 'application/json; charset=utf-8')
  create(@Body(ValidateCreatePipe) createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @Header('Content-Type', 'application/json; charset=utf-8')
  findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.userService.findAll(skip,take);
  }

  @Get('findbyname/:name')
  @Header('Content-Type', 'application/json; charset=utf-8')
  findOneByName(@Param('name') name: string) {
    return this.userService.findOneByName(name);
  }

  @Get('findbyemail/:email')
  @Header('Content-Type', 'application/json; charset=utf-8')
  findOneByEmail(@Param('email') email: string) {
    return this.userService.findOneByEmail(email);
  }

  @Get(':id')
  @Header('Content-Type', 'application/json; charset=utf-8')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(+id);
  }
  
  @Patch(':id')
  @Header('Content-Type', 'application/json; charset=utf-8')
  update(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Header('Content-Type', 'application/json; charset=utf-8')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
