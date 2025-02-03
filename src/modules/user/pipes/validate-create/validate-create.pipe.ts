import { ArgumentMetadata, HttpException, HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import { CreateUserDto } from '../../dto/create-user.dto';

@Injectable()
export class ValidateCreatePipe implements PipeTransform {
  transform(value: CreateUserDto, metadata: ArgumentMetadata) {
    // const rolId = parseInt(''+value.rolId)
    // if(isNaN(rolId)){
    //   throw new HttpException('Rol id must be a number', HttpStatus.BAD_REQUEST);
    // }
    // return {...value, rolId};
    return value
  }
}
