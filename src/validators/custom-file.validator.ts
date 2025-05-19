// Primero creamos una clase de validador personalizado
// custom-file.validator.ts
import { FileValidator } from '@nestjs/common';
import { Express } from 'express';

export class CustomFileValidator extends FileValidator {
  constructor(protected readonly validationOptions: Record<string, any> = {}) {
    super(validationOptions);
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) {
      return false;
    }

    // Verificar la extensión del archivo
    const fileName = file.originalname.toLowerCase();
    const allowedExtensions = ['.png', '.jpeg', '.jpg', '.pdf', '.doc', '.docx', '.xls', 
                             '.xlsx', '.ppt', '.pptx', '.rar', '.tar', '.zip', '.txt', 
                             '.css', '.html', '.js', '.json', '.xml', '.md', '.bin'];
    
    // Comprobar si el archivo tiene una extensión permitida
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    // Comprobar si el tipo MIME es conocido y permitido
    const allowedMimeTypes = [
      'image/png', 'image/jpeg', 'application/pdf', 
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip', 'application/x-tar', 'application/x-rar-compressed',
      'text/plain', 'text/css', 'text/html', 'application/javascript', 'application/json',
      'application/xml', 'text/markdown', 'application/octet-stream'
    ];
    
    const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
    
    // Para archivos .txt, aceptarlos independientemente del MIME type
    if (fileName.endsWith('.txt')) {
      return true;
    }
    
    return hasValidExtension && hasValidMimeType;
  }

  buildErrorMessage(): string {
    return 'Tipo de archivo no permitido. Extensiones permitidas: png, jpeg, jpg, pdf, doc, docx, xls, xlsx, ppt, pptx, rar, tar, zip, txt, css, html, js, json, xml, md, bin';
  }
}
