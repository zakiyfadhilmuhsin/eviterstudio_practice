import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT ?? 3018;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📁 Upload endpoints available at:`);
  logger.log(`   • POST /upload/single - Single file upload`);
  logger.log(`   • POST /upload/multiple - Multiple files upload`);
  logger.log(`   • GET /upload/files - List all files`);
  logger.log(`   • GET /upload/uploads - List all uploads`);
  logger.log(`   • GET /upload/file/:id - Get file details`);
  logger.log(`   • GET /upload/upload/:id - Get upload details`);
  logger.log(`   • DELETE /upload/file/:id - Delete file`);
  logger.log(`   • GET /upload/health - Health check`);
}
bootstrap();
