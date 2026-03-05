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

  // CORS : support multi-origines (dev local + Vercel + domaine custom)
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Pas d'origin = requête serveur-à-serveur (autorisé)
      if (!origin) {
        return callback(null, true);
      }

      // Localhost/127.0.0.1 (dev)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Réseau local 192.168.x.x (dev mobile)
      if (/^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Origines autorisées via .env (Vercel, domaine custom)
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Sinon : bloqué
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
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
