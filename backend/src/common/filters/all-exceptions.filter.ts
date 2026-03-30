import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // ✅ On extrait toujours une string propre
    let message: string;
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message =
          typeof obj['message'] === 'string'
            ? obj['message']
            : Array.isArray(obj['message'])
            ? (obj['message'] as string[]).join(', ')
            : exception.message;
      } else {
        message = exception.message;
      }
    } else {
      message = 'Internal server error';
    }

    const browserOnlyPaths = ['/favicon.ico', '/robots.txt', '/apple-touch-icon.png'];
    const isBrowserNoise = browserOnlyPaths.includes(request.url);

    if (!isBrowserNoise) {
      if (status >= 500) {
        this.logger.error(
          `${request.method} ${request.url} - ${status}`,
          exception instanceof Error ? exception.stack : String(exception),
        );
      } else {
        this.logger.warn(`${request.method} ${request.url} - ${status}`);
      }
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message, // ✅ Toujours une string
    });
  }
}