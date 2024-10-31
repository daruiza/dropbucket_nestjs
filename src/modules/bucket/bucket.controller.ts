import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Res, ParseFilePipe, FileTypeValidator, MaxFileSizeValidator, Query } from '@nestjs/common';
import { BucketService } from './bucket.service';
import { CreateBucketDto } from './dto/create-bucket.dto';
import { UpdateBucketDto } from './dto/update-bucket.dto';
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
  ): Promise<{ files: string[], folders: string[] }> {
    return await this.bucketService.listObjects(prefix);
  }


  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile(
    new ParseFilePipe({
      validators: [
        new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        new MaxFileSizeValidator({
          maxSize: 10485760,
          message: 'File is too large. Max file size is 10MB',
        }),
      ],
      fileIsRequired: true,
    })
  ) file: Express.Multer.File,
    @Body() body: any
  ): Promise<any> {
    return await this.bucketService.uploadFile(file);
  }

  @Post('uploadsimple')
  @UseInterceptors(FileInterceptor('file'))
  async uploadsimple(@UploadedFile() file: Express.Multer.File): Promise<any> {
    return await this.bucketService.uploadFile(file);
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


  @Post()
  create(@Body() createBucketDto: CreateBucketDto) {
    return this.bucketService.create(createBucketDto);
  }

  @Get()
  findAll() {
    return this.bucketService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bucketService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBucketDto: UpdateBucketDto) {
    return this.bucketService.update(+id, updateBucketDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bucketService.remove(+id);
  }
}
