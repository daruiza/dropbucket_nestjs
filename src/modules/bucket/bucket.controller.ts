import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Res, ParseFilePipe, FileTypeValidator, MaxFileSizeValidator, Query, HttpException, HttpStatus, ParseBoolPipe, StreamableFile, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { BucketService } from './bucket.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as path from 'path';


@ApiBearerAuth()
@ApiTags('bucket')
@UseGuards(AuthGuard)
@Controller('bucket')
export class BucketController {
  constructor(private readonly bucketService: BucketService) { }


  // TODO: el listar debe tambien traer metadatos {tamaño, etc}
  @Get('list')
  async listObjects(
    @Query('prefix') prefix?: string,
    @Query('delimiter') delimiter?: string,
    @Query('size', ParseBoolPipe) size?: boolean,
    @Query('sort') sort?: string,
  ): Promise<{ files: string[], folders: string[] }> {
    return await this.bucketService.listObjects(prefix, delimiter, size, null, JSON.parse(sort));
  }


  @Get('exists/:fileKey')
  async checkFileExists(
    @Param('fileKey') fileKey: string): Promise<{ exists: boolean }> {
    try {
      const exists = await this.bucketService.checkFileExists(fileKey);
      return { exists };
    } catch (error) {
      throw new HttpException(
        'Error al verificar la existencia del archivo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf|doc|docx|xls|xlsx|ppt|pptx|rar|tar|zip|txt|css|html|js|json|xml|md|bin|octet-stream)' }),
          new MaxFileSizeValidator({
            maxSize: 10485760,
            message: 'File is too large. Max file size is 10MB',
          }),
        ],
        fileIsRequired: true,
      })
    ) file: Express.Multer.File,
    @Body('prefix') prefix?: string,
  ): Promise<any> {
    return await this.bucketService.uploadFile(file, prefix);
  }

  @Get('url')
  async getFile(
    @Query('key') key: string) {
    const url = await this.bucketService.getFileUrl(key);
    return url;
  }

  @Get('object')
  async downloadObject(
    @Query('key') key: string,
  ) {
    if (!key) {
      // Manejar caso donde no se proporciona key
      throw new BadRequestException('Se requiere un key de objeto');
    }

    try {
      const fileBuffer = await this.bucketService.downloadObject(key);
      const filename = path.basename(key);
      // Puedes hacer más operaciones con el buffer
      // return new StreamableFile(fileBuffer);
      return new StreamableFile(fileBuffer, {
        type: 'application/octet-stream', // Tipo genérico para archivos binarios
        disposition: `attachment; filename="${filename}"` // Sugerir nombre de archivo
      });
    } catch (error) {
      // Manejo de errores
      console.error('Error en descarga de objeto:', error);

      // Mapear diferentes tipos de errores
      if (error.name === 'NoSuchKey') {
        throw new NotFoundException('Objeto no encontrado en el bucket');
      }
      throw new InternalServerErrorException('Error al descargar el objeto');

    }
  }

  @Get('download')
  async downloadFile(
    @Query('key') key: string,
    @Res() res: Response) {
    const fileBuffer = await this.bucketService.downloadFile(key);
    res.send(fileBuffer);
  }

  @Post('create/prefix')
  async createFolder(
    @Query('key') key: string) {
    return await this.bucketService.createFolder(key);
  }

  @Delete('delete/prefix')
  async delteFolder(
    @Query('key') key: string) {
    return await this.bucketService.deleteFolder(key);
  }


  @Delete()
  async deleteFile(
    @Query('key') key: string,
    @Res() res: Response) {
    const fileBuffer = await this.bucketService.deleteFile(key);
    res.send(fileBuffer);
  }


}
