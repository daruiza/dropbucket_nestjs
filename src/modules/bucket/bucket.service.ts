import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateBucketDto } from './dto/create-bucket.dto';
import { UpdateBucketDto } from './dto/update-bucket.dto';
import { DeleteObjectCommand, GetObjectCommand, GetObjectCommandOutput, ListObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BucketService {

  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION, // Region
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      // forcePathStyle: true,
    });

    this.bucketName = process.env.AWS_BUCKET; // Nombre del bucket
  }

  async listObjects(prefix: string = ''): Promise<{ files: string[], folders: string[] }> {
    const params = {
      Bucket: this.bucketName,
      Prefix: prefix, // Puedes usar un prefijo para filtrar los resultados
      // Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`, // Asegura que termine en "/"
      Delimiter: '/', // Para limitar el resultado al nivel actual
    };   

    try {
      const data = await this.s3Client.send(new ListObjectsCommand(params));

      const files = data.Contents ? data.Contents.map((item) => item.Key || '') : [];
      const folders = data.CommonPrefixes ? data.CommonPrefixes.map((prefix) => prefix.Prefix || '') : [];

      return { files, folders };

    } catch (error) {
      throw new Error(`Error al listar objetos en el bucket: ${error.message}`);
    }
  }


  // TODO falta el detalle del folder,name,...
  async uploadFile(
    file: Express.Multer.File): Promise<any> {

    const fileKey = `${uuidv4()}-${file.originalname}`;
    const params = {
      Bucket: this.bucketName,
      Key: `folder/${fileKey}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
      },
    };

    try {
      await this.s3Client.send(new PutObjectCommand(params));
      return {
        fileKey,
        url: `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`,
        upload: 'OK'
      }; // Regresar la clave del archivo en S3
    } catch (error) {
      throw new Error(`Error al subir el archivo a S3: ${error.message}`);
    }
  }

  // TODO: necesita más detalle del folder
  async getFileUrl(key: string) {
    return { url: `https://${this.bucketName}.s3.amazonaws.com/${key}` };
  }

  async getFile(key: string): Promise<GetObjectCommandOutput> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      const file = await this.s3Client.send(new GetObjectCommand(params));
      return file;
    } catch (error) {
      throw new Error(`Error al obtener el archivo de S3: ${error.message}`);
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    const file = await this.getFile(key);
    const stream = file.Body as Readable;

    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  // TODO Falta detalles del folder
  async deleteFile(key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      return { message: 'File deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }



  create(createBucketDto: CreateBucketDto) {
    return 'This action adds a new bucket';
  }

  findAll() {
    return `This action returns all bucket`;
  }

  findOne(id: number) {
    return `This action returns a #${id} bucket`;
  }

  update(id: number, updateBucketDto: UpdateBucketDto) {
    return `This action updates a #${id} bucket`;
  }

  remove(id: number) {
    return `This action removes a #${id} bucket`;
  }
}
