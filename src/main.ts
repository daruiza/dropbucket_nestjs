
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true
  }))
  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('DropBucket documentation')
    .setDescription('The DropBucket API description')
    .setVersion('1.0')
    .addTag('auth')
    .addTag('user')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('documentation', app, documentFactory);

  // Habilitar CORS
  app.enableCors({
    origin: '*', // Permite cualquier origen (prueba con esto primero)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Configurar express para usar charset UTF-8
  // app.use((req, res, next) => {
  //   res.setHeader('Content-Type', 'application/json');
  //   next();
  // });

  // app.enableCors({
  //   origin: 'http://flutter:8080', // Ajusta esto según tu entorno
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //   credentials: true,
  // });

  await app.listen(process.env.PORT ?? 3031, '0.0.0.0');
}
bootstrap();
