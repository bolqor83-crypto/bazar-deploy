/**
 * Доменная ошибка API с машинным кодом.
 *
 * Фильтр http-exception.filter переводит её в единый формат ответа:
 * { statusCode, error, message, code }. Клиент (mobile) маппит code
 * в русские тексты — сервер не зависит от локали клиента, но message
 * человекочитаемый на русском для Swagger и отладки.
 */
import { HttpException, type HttpExceptionOptions } from '@nestjs/common';

export class ApiError extends HttpException {
  readonly code: string;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: HttpExceptionOptions,
  ) {
    super({ code, message }, status, options);
    this.code = code;
  }
}
