import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Res, ParseFilePipe, FileTypeValidator, MaxFileSizeValidator, Query, HttpException, HttpStatus } from '@nestjs/common';
import { BucketService } from './bucket.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@ApiBearerAuth()
@ApiTags('bucket')
@UseGuards(AuthGuard)
@Controller('bucket')
export class BucketController {
  constructor(private readonly bucketService: BucketService) { }


  @Get('list')
  async listObjects(
    @Query('prefix') prefix?: string,
    @Query('delimiter') delimiter?: string,
  ): Promise<{ files: string[], folders: string[] }> {
    return await this.bucketService.listObjects(prefix, delimiter);
  }


  @Get('exists/:fileKey')
  async checkFileExists(@Param('fileKey') fileKey: string): Promise<{ exists: boolean }> {
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
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf|doc|docx|xls|xlsx|ppt|pptx|rar|tar|zip|txt|css|html|js|json|xml|md)' }),
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

  @Get(':key')
  async getFile(@Param('key') key: string, @Res() res: Response) {
    const url = await this.bucketService.getFileUrl(key);
    return url;
  }

  @Get('download/:key')
  async downloadFile(@Param('key') key: string, @Res() res: Response) {
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

  // TODO, CREAR Y BORRR UNA CARPETA

}
