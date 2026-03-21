import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { NotificationType } from './common/enums/notification-type.enum';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function syncNotificationEnum(app) {
  const dataSource = app.get(getDataSourceToken());
  for (const value of Object.values(NotificationType)) {
    await dataSource.query(
      `ALTER TYPE "email_logs_notificationtype_enum" ADD VALUE IF NOT EXISTS '${value}'`
    );
  }
  console.log('✅ Enum email_logs_notificationtype_enum synchronized');
}

async function bootstrap() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
  }

  const app = await NestFactory.create(AppModule);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));

  const isDev = process.env.NODE_ENV === 'development';

  const allowedOrigins = [
    'https://wenddtransport.com',
    'https://www.wenddtransport.com',
    'https://transport-six-xi.vercel.app',
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
    ...(isDev ? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4200',
    ] : []),
  ]
    .map(o => o?.trim())
    .filter(Boolean) as string[];

  console.log('✅ CORS allowed origins:', allowedOrigins.length ? allowedOrigins : ['(none — only localhost)']);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-supervision-token'],
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

  await syncNotificationEnum(app);

  console.log(`🚀 WEND'D Transport API running on http://localhost:${port}/api/v1`);
}

bootstrap();