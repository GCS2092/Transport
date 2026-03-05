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
  // Sources d'origines autorisées :
  //   1. localhost / 127.0.0.1 (tout port) — dev
  //   2. 192.168.x.x (tout port) — dev mobile réseau local
  //   3. *.vercel.app — tous les déploiements Vercel
  //   4. FRONTEND_URL — l'URL principale du frontend (ex: https://transport-six-xi.vercel.app)
  //   5. ALLOWED_ORIGINS — liste CSV d'URLs supplémentaires
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS || '').split(','),
  ]
    .map(o => o?.trim())
    .filter(Boolean) as string[];

  console.log('✅ CORS allowed origins:', allowedOrigins.length ? allowedOrigins : ['(none — only localhost)']);

  app.enableCors({
    origin: (origin, callback) => {
      // Pas d'origin = requête serveur-à-serveur (autorisé)
      if (!origin) return callback(null, true);

      // Localhost / 127.0.0.1 (dev)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);

      // Réseau local 192.168.x.x (dev mobile)
      if (/^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)) return callback(null, true);

      // *.vercel.app (tous les déploiements preview + production Vercel)
      if (/^https:\/\/[a-zA-Z0-9-]+(\.vercel\.app)$/.test(origin)) return callback(null, true);

      // Origines explicitement autorisées via .env
      if (allowedOrigins.includes(origin)) return callback(null, true);

      console.warn(`CORS blocked: ${origin}`);
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
  console.log(`🚀 WEND'D Transport API running on http://localhost:${port}/api/v1`);
}

bootstrap();
