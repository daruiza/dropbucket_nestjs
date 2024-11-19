import { HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, GetObjectCommandOutput, HeadObjectCommand, ListObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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

  async listObjects(
    prefix: string = '',
    delimiter: string = '/',
    size: boolean = false): Promise<{ files: any[], folders: any[] }> {
    const params = {
      Bucket: this.bucketName,
      Prefix: prefix, // Puedes usar un prefijo para filtrar los resultados
      // Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`, // Asegura que termine en "/"
      Delimiter: delimiter, // Para limitar el resultado al nivel actual
    };

    try {
      const data = await this.s3Client.send(new ListObjectsCommand(params));

      const files = data.Contents ? data.Contents.map((item: any) => ({
        Name: item.Key,
        Extension: this.getFileExtension(item.Key),
        LastModified: item.LastModified,
        Size: item.Size,
      })) : [];

      let folders = data.CommonPrefixes ? data.CommonPrefixes.map((prefix) => ({
        Name: prefix.Prefix || '',
        Size: null,
      })) : [];
      console.log('size', size);
      
      if (size) {
        folders = data.CommonPrefixes ? await Promise.all(
          data.CommonPrefixes.map(async (prefix) => {
            const folderPrefix = prefix.Prefix || '';

            // Obtenemos el tamaño total de los objetos bajo este prefijo (carpeta)
            const folderSize = await this.getFolderSize(folderPrefix);

            return {
              Name: folderPrefix,
              Size: folderSize,
            };
          })
        ) : [];
      }

      return { files, folders };

    } catch (error) {
      throw new Error(`Error al listar objetos en el bucket: ${error.message}`);
    }
  }

  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  // Método auxiliar para calcular el tamaño total de una carpeta
  private async getFolderSize(folderPrefix: string): Promise<number> {
    let totalSize = 0;
    let continuationToken;

    do {
      const params = {
        Bucket: this.bucketName,
        Prefix: folderPrefix,
        ContinuationToken: continuationToken,
      };

      const data = await this.s3Client.send(new ListObjectsCommand(params));

      // Sumamos el tamaño de cada objeto bajo el prefijo de la carpeta
      if (data.Contents) {
        totalSize += data.Contents.reduce((sum, item) => sum + (item.Size || 0), 0);
      }

      // Continuamos si hay más objetos en la carpeta
      // continuationToken = data.NextContinuationToken;
      continuationToken = data.IsTruncated ? 1 : undefined;

    } while (continuationToken);

    return totalSize;
  }


  async checkFileExists(fileKey: string): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    try {
      await this.s3Client.send(command);
      return true; // El archivo existe
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false; // El archivo no existe
      }
      // Manejo de otros posibles errores
      throw new HttpException(
        `Error al consultar el archivo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // TODO falta el detalle del folder,name,...
  async uploadFile(
    file: Express.Multer.File,
    prefixarg: string | null = null
  ): Promise<any> {

    const prefix = prefixarg ? prefixarg.endsWith('/') ? prefixarg : `${prefixarg}/` : '';
    const fileName = file.originalname.replace(/\.[^/.]+$/, ""); // nombre sin extención
    const fileExt = file.originalname.split('.').pop(); // nombre sin extención

    try {
      // Primero miramios si el archivo existe           
      const { files } = await this.listObjects(`${prefix}${fileName}`);
      const key = `${prefix}${fileName}${files ? files.length ? '_' + (+files.length + 1) : '' : ''}.${fileExt}`;

      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
        },
      };

      await this.s3Client.send(new PutObjectCommand(params));
      return {
        key,
        url: `https://${this.bucketName}.s3.amazonaws.com/${key}`,
        upload: true,
        exist: files.length
      }; // Regresar la clave del archivo en S3
    } catch (error) {
      throw new HttpException(
        `Error al subir el archivo a S3: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR);
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
      throw new HttpException(
        `Error al obtener el archivo de S3: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    const file = await this.getFile(key);
    const stream = file.Body as Readable;

    try {
      return new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      throw new HttpException(
        `Error al obtener el archivo de S3: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createFolder(folderPath: string): Promise<any> {
    // Asegúrate de que el `folderPath` termine con una barra "/"
    if (!folderPath.endsWith('/')) {
      folderPath += '/';
    }

    const params = {
      Bucket: this.bucketName,
      Key: folderPath, // Esto actúa como la carpeta
      Body: '', // Dejar el cuerpo vacío ya que no necesita contenido
    };

    try {
      await this.s3Client.send(new PutObjectCommand(params));
      return { message: `Carpeta ${folderPath} creada con éxito` };
    } catch (error) {
      console.error('Error al crear la carpeta en S3:', error);
      throw new Error('No se pudo crear la carpeta en S3');
    }

  }

  async deleteFile(key: string): Promise<any> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      try {
        await this.s3Client.send(headCommand);
      } catch (error) {
        // Si el archivo no se encuentra, lanzamos una excepción
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
          throw new NotFoundException('File not found');
        } else {
          // Otro error en la consulta HeadObject
          throw new InternalServerErrorException('Error checking file existence');
        }
      }

      const response = await this.s3Client.send(command);

      return {
        response,
        httpStatusCode: response.$metadata.httpStatusCode,
        message: `File ${key} deleted successfully`
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async deleteFolder(folderPath: string): Promise<any> {
    if (!folderPath.endsWith('/')) {
      folderPath += '/';
    }

    try {
      // 1. Listar todos los objetos con el prefijo dado
      const listedObjects = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: folderPath,
        }),
      );

      if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
        console.log(`No se encontraron objetos en la carpeta ${folderPath}`);
        return;
      }

      // 2. Preparar la lista de objetos a eliminar
      const deleteParams = {
        Bucket: this.bucketName,
        Delete: {
          Objects: listedObjects.Contents.map((obj) => ({ Key: obj.Key })),
        },
      };

      // 3. Ejecutar el comando para eliminar los objetos
      await this.s3Client.send(new DeleteObjectsCommand(deleteParams));
      return `Carpeta ${folderPath} y sus objetos fueron eliminados correctamente.`;
    } catch (error) {
      console.error('Error al eliminar la carpeta en S3:', error);
      throw new Error('No se pudo eliminar la carpeta en S3');
    }
  }

}
