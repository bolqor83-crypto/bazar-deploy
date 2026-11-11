/**
 * Единый формат ошибок API.
 *
 * {
 *   "statusCode": 401,
 *   "error": "Unauthorized",
 *   "message": "Неверный номер или пароль",
 *   "code": "AUTH_INVALID_CREDENTIALS"
 * }
 *
 * ApiError отдаёт machine-readable code; ошибки валидации DTO
 * (class-validator) агрегируются в VALIDATION_ERROR со списком
 * сообщений на русском.
 */
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/** Английское имя статуса для поля error. */
const ERROR_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

function errorNameFor(status: number): string {
  return ERROR_NAMES[status] ?? 'Error';
}

@Catch()
export class HttpApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      let code = 'UNKNOWN';
      let message: string | string[] = exception.message;

      if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        if (typeof record.code === 'string') {
          code = record.code;
        }
        if (typeof record.message === 'string') {
          message = record.message;
        } else if (Array.isArray(record.message)) {
          // Ошибки class-validator: массив строк.
          message = record.message.filter(
            (m): m is string => typeof m === 'string',
          );
          code = 'VALIDATION_ERROR';
        }
      }

      if (status >= 500) {
        this.logger.error(`HTTP ${status} ${code}: ${JSON.stringify(message)}`);
      }

      response.status(status).json({
        statusCode: status,
        error: errorNameFor(status),
        message,
        code,
      });
      return;
    }

    // Непредвиденная ошибка: детали наружу не отдаём.
    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Внутренняя ошибка сервера',
      code: 'INTERNAL_ERROR',
    });
  }
}
