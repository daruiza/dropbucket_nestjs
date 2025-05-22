import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Res, ParseFilePipe, FileTypeValidator, MaxFileSizeValidator, Query, HttpException, HttpStatus, ParseBoolPipe, StreamableFile, BadRequestException, NotFoundException, InternalServerErrorException, UploadedFiles, Header } from '@nestjs/common';
import { BucketService } from './bucket.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as path from 'path';
import * as archiver from 'archiver';
import { Express } from 'express';
import { Public } from '../../decorators/public.decorator';
import { CustomFileValidator } from '../../validators/custom-file.validator';

@ApiBearerAuth()
@ApiTags('bucket')
@UseGuards(AuthGuard)
@Controller('bucket')
export class BucketController {
  constructor(private readonly bucketService: BucketService) { }

  // TODO: el listar debe tambien traer metadatos {tamaño, etc}
  @Get('list')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async listObjects(
    @Query('prefix') prefix?: string,
    @Query('delimiter') delimiter?: string,
    @Query('size', ParseBoolPipe) size?: boolean,
    @Query('sort') sort?: string,
  ): Promise<{ files: string[], folders: string[] }> {
    return await this.bucketService.listObjects(prefix, delimiter, size, null, JSON.parse(sort));
  }


  @Get('exists')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async checkFileExists(
    @Query('key') key: string): Promise<{ exist: boolean }> {
    try {
      const exist = await this.bucketService.checkFileExists(key);
      return { exist };
    } catch (error) {
      throw new HttpException(
        'Error al verificar la existencia del archivo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('prefix-exists')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async checkPrefixExists(
    @Query('prefix') prefix: string,
  ): Promise<{ exist: boolean }> {
    try {
      const exist = await this.bucketService.checkPrefixExists(prefix);
      return { exist };
    } catch (error) {
      throw new HttpException(
        'Error al verificar la existencia del prefix',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload')
  @Header('Content-Type', 'application/json; charset=utf-8')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // new CustomFileValidator(),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf|doc|docx|xls|xlsx|ppt|pptx|rar|tar|zip|txt|css|html|js|json|xml|md|bin|txt|octet-stream)' }),
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
  
  @Post('upload-multiple')
  @Header('Content-Type', 'application/json; charset=utf-8')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFiles(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new CustomFileValidator(),
          new MaxFileSizeValidator({
            maxSize: 10485760,
            message: 'File is too large. Max file size is 10MB',
          }),
        ],
        fileIsRequired: true,
      })
    ) files: Express.Multer.File[],
    @Body('prefix') prefix?: string,
  ): Promise<any> {
    return await this.bucketService.uploadMultipleFiles(files, prefix);
  }

  @Public()
  @Post('upload-multiple-public')
  @Header('Content-Type', 'application/json; charset=utf-8')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFilesPublic(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new CustomFileValidator(),
          new MaxFileSizeValidator({
            maxSize: 10485760,
            message: 'File is too large. Max file size is 10MB',
          }),
        ],
        fileIsRequired: true,
      })
    ) files: Express.Multer.File[],
    @Body('prefix') prefix?: string,
  ): Promise<any> {
    return await this.bucketService.uploadMultipleFiles(files, prefix);
  }


  @Get('url')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async getFile(
    @Query('key') key: string) {
    const url = await this.bucketService.getFileUrl(key);
    return url;
  }

  // @Get('view/pdf')
  // @Header('Content-Type', 'application/pdf')
  // async viewAsPdf(@Query('key') key: string): Promise<StreamableFile> {
  //   if (!key) {
  //     throw new BadRequestException('Se requiere la clave del archivo.');
  //   }

  //   try {
  //     const pdfBuffer = await this.bucketService.convertToPdf(key);
  //     const filename = path.basename(key, path.extname(key)) + '.pdf';
  //     return new StreamableFile(pdfBuffer, {
  //       disposition: `inline; filename="${filename}"`, // 'inline' para mostrar en el navegador
  //     });
  //   } catch (error) {
  //     console.error('Error al convertir y servir el archivo como PDF:', error);
  //     if (error instanceof NotFoundException) {
  //       throw error;
  //     }
  //     throw new HttpException(
  //       'Error al procesar el archivo para visualización.',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  @Get('object-old')  
  async downloadObjecOld(
    @Query('key') key: string,
    @Res({ passthrough: true }) res: Response
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

@Get('object')
async downloadObject(
  @Query('key') key: string,
  @Res({ passthrough: true }) res: Response
) {
  if (!key) {
    throw new BadRequestException('Se requiere un key de objeto');
  }

  try {
    const fileBuffer = await this.bucketService.downloadObject(key);
    const filename = path.basename(key);
    
    // Determinar el tipo MIME basado en la extensión del archivo
    const mimeType = this.getMimeType(filename);
    
    // Para archivos binarios, no incluimos charset
    const isTextFile = mimeType.startsWith('text/') || 
                       mimeType === 'application/json' ||
                       mimeType === 'application/xml';
    
    // Configurar los headers apropiadamente
    res.set({
      'Content-Type': isTextFile ? `${mimeType}; charset=utf-8` : mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': fileBuffer.length.toString(),
      'Access-Control-Expose-Headers': 'Content-Disposition'
    });

    return new StreamableFile(fileBuffer);
  } catch (error) {
    console.error('Error en descarga de objeto:', error);
    
    if (error.name === 'NoSuchKey') {
      throw new NotFoundException('Objeto no encontrado en el bucket');
    }
    throw new InternalServerErrorException('Error al descargar el objeto');
  }
}

  // Método para determinar el tipo MIME basado en la extensión
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.rar': 'application/x-rar-compressed',
      '.tar': 'application/x-tar',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.css': 'text/css',
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.md': 'text/markdown',
      '.bin': 'application/octet-stream',      
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }


  @Get('download')
  async downloadFile(
    @Query('key') key: string,
    @Res() res: Response) {
    const fileBuffer = await this.bucketService.downloadFile(key);
    res.send(fileBuffer);
  }

  @Get('download-multiple')
  async downloadMultipleFiles(
    @Query('keys') keys: string,
    @Res() res: Response,
  ) {
    const fileKeys = keys.split(',');
    const archive = archiver('zip');

    res.attachment('files.zip');
    archive.pipe(res);

    for (const key of fileKeys) {
      const fileBuffer = await this.bucketService.downloadFile(key);
      archive.append(fileBuffer, { name: key });
    }

    await archive.finalize();
  }

  @Post('create/prefix')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async createFolder(
    @Query('key') key: string) {
    return await this.bucketService.createFolder(key);
  }

  @Delete('delete/prefix')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async delteFolder(
    @Query('key') key: string) {
    return await this.bucketService.deleteFolder(key);
  }

  @Delete()
  @Header('Content-Type', 'application/json; charset=utf-8')
  async deleteFile(
    @Query('key') key: string,
    @Res() res: Response) {
    const response = await this.bucketService.deleteFile(key);
    res.send(response);
  }

  @Get('renamefile')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async renameFile(
    @Query('oldkey') oldkey: string,
    @Query('newkey') newkey: string) {
    const url = await this.bucketService.renameFile(oldkey, newkey);
    return url;
  }

  @Get('renameprefix')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async renamePrefix(
    @Query('oldprefix') oldprefix: string,
    @Query('newprefix') newprefix: string) {
    const url = await this.bucketService.renamePrefix(oldprefix, newprefix);
    return url;
  }

}
