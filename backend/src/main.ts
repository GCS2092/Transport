import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';
import * as helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
  }

  const app = await NestFactory.create(AppModule);

  app.use(helmet.default());

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3001',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 VTC Dakar API running on http://localhost:${port}/api/v1`);
}

bootstrap();
