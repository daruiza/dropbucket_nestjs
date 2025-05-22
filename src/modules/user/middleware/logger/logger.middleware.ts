import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP'); // Usamos el Logger de NestJS para mejor gestión

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode, statusMessage } = res;
      const contentLength = res.get('content-length') || 0;
      const responseTime = Date.now() - startTime;

      const now = new Date();
      const colombianTime = now.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3, // Para milisegundos si es necesario
      });

      const logMessage = {
        timestamp: colombianTime,
        // timestamp: new Date().toISOString(),
        method,
        originalUrl,
        ip,
        userAgent,
        requestHeaders: this.getRequestHeaders(req),
        requestBody: this.getRequestBody(req), // Capturar el body de la petición
        statusCode,
        statusMessage,
        contentLength,
        responseTime: `${responseTime}ms`,
        responseHeaders: this.getResponseHeaders(res),
      };

      if (statusCode >= 400) {
        this.logger.error(JSON.stringify(logMessage)); // Log de errores
      } else {
        this.logger.log(JSON.stringify(logMessage)); // Log de sucesos
      }
    });

    next();
  }

  private getRequestHeaders(req: Request): Record<string, any> {
    const headersToLog = [
      'accept',
      'accept-encoding',
      'accept-language',
      'authorization',
      'content-type',
      'content-length',
      'user-agent',
      'x-forwarded-for', // Para proxies
      'x-real-ip',       // Para proxies
      // Agrega aquí otras cabeceras que consideres importantes
    ];
    const headers: Record<string, any> = {};
    headersToLog.forEach((headerName) => {
      const headerValue = req.get(headerName);
      if (headerValue) {
        headers[headerName] = headerValue;
      }
    });
    return headers;
  }

  private getResponseHeaders(res: Response): Record<string, any> {
    const headersToLog = [
      'content-type',
      'content-length',
      'etag',
      'last-modified',
      // Agrega aquí otras cabeceras de respuesta relevantes
    ];
    const headers: Record<string, any> = {};
    headersToLog.forEach((headerName) => {
      const headerValue = res.getHeader(headerName);
      if (headerValue) {
        headers[headerName] = headerValue;
      }
    });
    return headers;
  }

  private getRequestBody(req: Request): any {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      return req.body;
    }
    return undefined;
  }
}