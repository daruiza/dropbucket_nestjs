import { 
  HttpException, 
  HttpStatus, 
  Injectable, 
  InternalServerErrorException, 
  NotFoundException } from '@nestjs/common';

import { 
  CopyObjectCommand, 
  DeleteObjectCommand, 
  DeleteObjectsCommand, 
  GetObjectCommand, 
  GetObjectCommandOutput, 
  HeadObjectCommand, 
  ListObjectsCommand, 
  ListObjectsV2Command, 
  PutObjectCommand } from '@aws-sdk/client-s3';

import { Upload } from '@aws-sdk/lib-storage';
import { S3Client, S3 } from "@aws-sdk/client-s3";

  
import { Readable } from 'stream';
import slugify from 'slugify';
import { parse } from 'path';


import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as util from 'util';
import { exec } from 'child_process';

const asyncExec = util.promisify(exec);

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
    size: boolean = false,
    filter?: { name?: string; date?: Date },
    sort?: {
      by: 'name' | 'date';
      order: 'asc' | 'desc';
    }
  ): Promise<{ files: any[], folders: any[] }> {

    const params = {
      Bucket: this.bucketName,
      Prefix: prefix, // Puedes usar un prefijo para filtrar los resultados
      // Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`, // Asegura que termine en "/"
      Delimiter: delimiter, // Para limitar el resultado al nivel actual
    };

    try {
      const data = await this.s3Client.send(new ListObjectsCommand(params));

      let files = data.Contents ? data.Contents.filter(el => el.Size).map((item: any) => ({
        Name: item.Key,
        Extension: this.getFileExtension(item.Key),
        LastModified: item.LastModified,
        Size: item.Size,
      })) : [];

      let folders = data.CommonPrefixes ? data.CommonPrefixes.map((prefix) => ({
        Name: prefix.Prefix || '',
        Size: null,
      })) : [];

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

      // Aplicar filtros
      if (filter) {
        if (filter.name) {
          const lowerCaseName = filter.name.toLowerCase();
          files = files.filter((file) =>
            file.Name.toLowerCase().includes(lowerCaseName)
          );
          folders = folders.filter((folder) =>
            folder.Name.toLowerCase().includes(lowerCaseName)
          );
        }

        if (filter.date) {
          const filterDate = filter.date;
          files = files.filter((file) =>
            file.LastModified ? new Date(file.LastModified) >= filterDate : false
          );
        }
      }

      // Ordenar resultados
      if (sort) {
        const compareFn = (a: any, b: any) => {
          if (sort.by === 'name') {
            const comparison = a.Name.localeCompare(b.Name);
            return sort.order === 'asc' ? comparison : -comparison;
          } else if (sort.by === 'date') {
            const comparison = new Date(a.LastModified).getTime() - new Date(b.LastModified).getTime();
            return sort.order === 'asc' ? comparison : -comparison;
          }
          return 0;
        };

        files = files.sort(compareFn);
        folders = folders.sort(compareFn);
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
      if (!fileKey) return false;
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

  async checkPrefixExists(prefix: string): Promise<boolean> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
      MaxKeys: 1,
    });

    try {
      if (!prefix) return false;
      const response = await this.s3Client.send(command);
      return Boolean(response.Contents?.length);
    } catch (error) {
      throw new HttpException(
        `Error al consultar el prefix: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    prefixarg: string | null = null
  ): Promise<any> {

    const prefix = prefixarg ? prefixarg.endsWith('/') ? prefixarg : `${prefixarg}/` : '';
    const normalizedFileName = this.normalizeFileName(parse(file.originalname).name);
    const fileName = normalizedFileName.replace(/\.[^/.]+$/, ""); // nombre sin extención
    const fileExt = file.originalname.split('.').pop(); // nombre sin extención

    try {

      const mime = file.mimetype === 'application/octet-stream'
        ? this.getMimeType(file.originalname)
        : file.mimetype;

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

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    prefixarg: string | null = null
  ): Promise<any> {
    const uploadResults = [];
    const prefix = prefixarg ? prefixarg.endsWith('/') ? prefixarg : `${prefixarg}/` : '';

    for (const file of files) {
      try {
        const normalizedFileName = this.normalizeFileName(parse(file.originalname).name);
        const fileName = normalizedFileName.replace(/\.[^/.]+$/, "");
        const fileExt = file.originalname.split('.').pop();

        const mime = file.mimetype === 'application/octet-stream'
          ? this.getMimeType(file.originalname)
          : file.mimetype;

        const { files: existingFiles } = await this.listObjects(`${prefix}${fileName}`);
        const key = `${prefix}${fileName}${existingFiles ? existingFiles.length ? '_' + (+existingFiles.length + 1) : '' : ''}.${fileExt}`;

        const params = {
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            originalName: file.originalname,
          },
        };

        // await this.s3Client.send(new PutObjectCommand(params));

        const upload = new Upload({
          client: this.s3Client,
          params: {
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            Metadata: {
              originalName: file.originalname,
            },
          },
        });

        const result = await upload.done();

        uploadResults.push({
          key,
          url: `https://${this.bucketName}.s3.amazonaws.com/${key}`,
          upload: true,
          exist: existingFiles?.length || 0,
          originalName: file.originalname
        });
      } catch (error) {
        uploadResults.push({
          originalName: file.originalname,
          upload: false,
          error: error.message
        });
      }
    }

    return {
      totalFiles: files.length,
      successfulUploads: uploadResults.filter(r => r.upload).length,
      failedUploads: uploadResults.filter(r => !r.upload).length,
      results: uploadResults
    };
  }

  // Método para normalizar nombres de archivos
  private normalizeFileName(fileName: string): string {
    // return fileName
    //   .normalize('NFD') // Descompone los caracteres con acentos
    //   .replace(/[\u0300-\u036f]/g, '') // Elimina los caracteres de combinación de acentos
    //   .replace(/ñ/g, 'n')
    //   .replace(/Ñ/g, 'N');

    return slugify(fileName, {
      replacement: '_',   // Reemplaza caracteres especiales con guión bajo
      remove: /[*+~()'"!:@]/g, // Elimina caracteres especiales adicionales
      // lower: true,        // Convierte a minúsculas
      strict: true,       // Elimina acentos
    });
  }

  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'png': return 'image/png';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'zip': return 'application/zip';
      case 'json': return 'application/json';
      default: return 'application/octet-stream';
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

  // async convertToPdf(key: string): Promise<Buffer> {
  //   try {
  //     const fileExtension = path.extname(key).toLowerCase().substring(1);
  //     const s3Object = await this.downloadObject(key);
  //     const fileBuffer = s3Object as Buffer; // Aseguramos que sea un Buffer

  //     // Guardar el archivo temporalmente
  //     const tempDir = os.tmpdir();
  //     const originalFileName = path.join(tempDir, `original.${fileExtension}`);
  //     await fs.writeFile(originalFileName, fileBuffer);

  //     let pdfBuffer: Buffer;

  //     switch (fileExtension) {
  //       case 'pdf':
  //         pdfBuffer = fileBuffer; // No se necesita conversión
  //         break;
  //       case 'doc':
  //       case 'docx':
  //         pdfBuffer = await this.convertToPdfUsingLibreOffice(originalFileName, 'doc');
  //         break;
  //       case 'xls':
  //       case 'xlsx':
  //         pdfBuffer = await this.convertToPdfUsingLibreOffice(originalFileName, 'xls');
  //         break;
  //       case 'ppt':
  //       case 'pptx':
  //         pdfBuffer = await this.convertToPdfUsingLibreOffice(originalFileName, 'ppt');
  //         break;
  //       case 'png':
  //       case 'jpg':
  //       case 'jpeg':
  //         pdfBuffer = await this.convertToPdfFromImage(originalFileName);
  //         break;
  //       default:
  //         await fs.unlink(originalFileName);
  //         throw new Error(`Formato de archivo "${fileExtension}" no soportado para conversión a PDF.`);
  //     }

  //     // Eliminar el archivo temporal
  //     await fs.unlink(originalFileName);
  //     return pdfBuffer;

  //   } catch (error) {
  //     console.error('Error al convertir a PDF:', error);
  //     if (error.message.includes('no existe en el bucket')) {
  //       throw new NotFoundException(error.message);
  //     }
  //     throw new InternalServerErrorException('No se pudo convertir el archivo a PDF.');
  //   }
  // }

  private async convertToPdfUsingLibreOffice(inputPath: string, format: string): Promise<Buffer> {
  try {
    const tempDir = os.tmpdir();
    const outputDir = path.join(tempDir, `output_${Date.now()}`);
    
    // Crear directorio temporal único para la salida
    await fs.mkdir(outputDir, { recursive: true });
    
    let libreOfficeFormat = '';
    
    switch (format) {
      case 'doc':
      case 'docx':
        libreOfficeFormat = 'writer_pdf_Export';
        break;
      case 'xls':
      case 'xlsx':
        libreOfficeFormat = 'calc_pdf_Export';
        break;
      case 'ppt':
      case 'pptx':
        libreOfficeFormat = 'impress_pdf_Export';
        break;
      default:
        throw new Error(`Formato "${format}" no soportado por LibreOffice.`);
    }
    
    // Para Excel usaremos un comando más simple pero efectivo
    let command;
    if (format === 'xls' || format === 'xlsx') {
      // Comando simplificado para Excel - a veces menos opciones funcionan mejor
      // Usar orientación de paisaje para hojas de cálculo
      command = `libreoffice --headless --norestore --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;
    } else {
      // Para otros formatos usar el comando con filtro específico
      command = `libreoffice --headless --norestore --convert-to pdf:"${libreOfficeFormat}" --outdir "${outputDir}" "${inputPath}"`;
    }
    
    console.log('Ejecutando comando:', command);
    
    const { stdout, stderr } = await asyncExec(command);
    console.log('LibreOffice stdout:', stdout);
    if (stderr) {
      console.error('LibreOffice stderr:', stderr);
    }
    
    // La ruta del archivo PDF generado por LibreOffice
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const generatedPdfPath = path.join(outputDir, `${baseName}.pdf`);
    
    // Verificar si el archivo existe
    try {
      await fs.access(generatedPdfPath);
    } catch (error) {
      console.error(`El archivo PDF no se encontró en: ${generatedPdfPath}`);
      console.log('Contenido del directorio:', await fs.readdir(outputDir));
      throw new Error(`No se pudo generar el PDF para el archivo ${format}`);
    }
    
    // Si el archivo existe, leerlo
    const pdfBuffer = await fs.readFile(generatedPdfPath);
    
    // Limpiar archivos temporales
    try {
      await fs.unlink(generatedPdfPath);
      await fs.rmdir(outputDir);
    } catch (cleanupError) {
      console.warn('Error al limpiar archivos temporales:', cleanupError);
    }
    
    return pdfBuffer;
  } catch (error) {
    console.error(`Error al convertir "${format}" a PDF con LibreOffice:`, error);
    throw new InternalServerErrorException(`Error al convertir archivo "${format}" a PDF.`);
  }
}

  private async convertToPdfFromImage(imagePath: string): Promise<Buffer> {
    try {
      const outputPath = `${imagePath}.pdf`;
      // Utilizar ImageMagick (debe estar instalado en el servidor)
      const command = `convert "${imagePath}" "${outputPath}"`;
      const { stdout, stderr } = await asyncExec(command);
      // console.log('ImageMagick stdout:', stdout);
      if (stderr) {
        console.error('ImageMagick stderr:', stderr);
      }
      const pdfBuffer = await fs.readFile(outputPath);
      await fs.unlink(outputPath);
      return pdfBuffer;
    } catch (error) {
      console.error('Error al convertir imagen a PDF con ImageMagick:', error);
      throw new InternalServerErrorException('Error al convertir la imagen a PDF.');
    }
  }

  /**
   * Descarga un archivo desde un bucket de S3
   * @param bucket Nombre del bucket de S3
   * @param key Ruta completa del archivo, incluyendo prefijos (ej. /documents/archivo.png)
   * @returns Promise con un buffer del archivo
   */
  async downloadObject(key: string): Promise<Buffer> {

    if (!key) {
      throw new Error('Key de objeto no proporcionado');
    }

    try {
      // Comando para obtener el objeto desde S3
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      // Ejecutar el comando y obtener la respuesta
      const response = await this.s3Client.send(command);

      // Convertir el stream a buffer
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        // Manejar el stream de datos
        (response.Body as Readable)
          .on('data', (chunk) => chunks.push(chunk))
          .on('error', (err) => reject(err))
          .on('end', () => {
            const fileBuffer = Buffer.concat(chunks);
            if (fileBuffer.length === 0) {
              reject(new Error('Archivo vacío'));
            }
            resolve(fileBuffer);
          });
      });
    } catch (error) {
      // Manejo de errores específicos
      if (error.name === 'NoSuchKey') {
        throw new Error(`El archivo con clave ${key} no existe en el bucket ${this.bucketName}`);
      }
      throw new Error(`Error al descargar el archivo: ${error.message}`);
    }
  }

  /**
   * Descarga un archivo desde S3 y lo guarda localmente
   * @param bucket Nombre del bucket de S3
   * @param key Ruta completa del archivo, incluyendo prefijos
   * @param localPath Ruta local donde se guardará el archivo
   */
  async downloadAndSaveFile(key: string, localPath: string): Promise<void> {
    try {
      const fileBuffer = await this.downloadObject(key);
      await require('fs').promises.writeFile(localPath, fileBuffer);
    } catch (error) {
      throw new Error(`Error al guardar el archivo localmente: ${error.message}`);
    }
  }

  async downloadFile(key: string): Promise<Buffer> {

    if (!key) {
      throw new NotFoundException('Key not found');
    }
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

    // todo: emite el siguiente error:  Are you using a Stream of unknown length as the Body of a PutObject request? Consider using Upload instead from @aws-sdk/lib-storage.

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

  /**
   * Rename a file in S3 by copying to a new location and then deleting the original
   * @param oldkey Original file path/key
   * @param newkey New file path/key
   * @returns Promise resolving to the new file location
   */
  async renameFile(oldkey: string, newkey: string): Promise<string> {
    try {
      // Codificar solo la parte del nombre del archivo (oldkey) para el CopySource
      const encodedOldKey = this.encodeS3Key(oldkey);
      // Copy the object to the new location
      const copyCommand = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${encodedOldKey}`,
        Key: newkey
      });
      await this.s3Client.send(copyCommand);

      // Delete the original object
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: oldkey
      });
      await this.s3Client.send(deleteCommand);

      return newkey;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        throw new Error(`El archivo original "${oldkey}" no existe en el bucket`);
      } else if (error.name === 'InvalidRequest') {
        throw new Error(`Solicitud inválida al intentar renombrar. Verifica los nombres de archivos: ${error.message}`);
      } else {
        console.error('Error al renombrar archivo en S3:', error);
        throw new Error(`Error al renombrar archivo de "${oldkey}" a "${newkey}": ${error.message}`);
      }
    }
  }

  encodeS3Key(key: string): string {
    // Primero decodifica para evitar doble codificación si ya estuviera codificada
    try {
      key = decodeURIComponent(key);
    } catch (e) {
      // Si hay error al decodificar, probablemente no estaba codificada
    }
    // Luego codifica correctamente
    return this.encodeS3UriPath(key);
  }

  encodeS3UriPath(key: string): string {
    // Divide la ruta por / y codifica cada segmento individualmente
    return key.split('/').map(encodeURIComponent).join('/');
  }

  /**
   * Rename a prefix (directory) in S3 by copying all objects and deleting originals
   * @param oldprefix Original prefix/directory
   * @param newprefix New prefix/directory
   * @returns Promise resolving when rename is complete
   */
  async renamePrefix(oldprefix: string, newprefix: string): Promise<void> {
    try {
      // Ensure prefixes have trailing slashes for correct matching
      const normalizedOldPrefix = oldprefix.endsWith('/') ? oldprefix : `${oldprefix}/`;
      const normalizedNewPrefix = newprefix.endsWith('/') ? newprefix : `${newprefix}/`;

      // List objects with the old prefix
      const listObjectsCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: normalizedOldPrefix
      });
      const listedObjects = await this.s3Client.send(listObjectsCommand);

      // Process each object
      if (listedObjects.Contents) {
        for (const obj of listedObjects.Contents) {
          // Calculate new key by replacing the old prefix with new prefix
          const newKey = obj.Key.replace(normalizedOldPrefix, normalizedNewPrefix);

          const encodedKey = this.encodeS3Key(obj.Key);
          // Copy object
          const copyCommand = new CopyObjectCommand({
            Bucket: this.bucketName,
            CopySource: `${this.bucketName}/${encodedKey}`,
            Key: newKey
          });
          await this.s3Client.send(copyCommand);

          // Delete original object
          const deleteCommand = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: obj.Key
          });
          await this.s3Client.send(deleteCommand);
        }
      }
    } catch (error) {
      console.error('Error renaming S3 prefix:', error);
      throw new Error(`Failed to rename prefix: ${error.message}`);
    }
  }

}
