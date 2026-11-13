/**
 * Rate limiter отправки OTP (Промт 10, Часть A).
 *
 * Per-phone: 3 отправки за 10 минут (скользящее окно, in-memory).
 * Per-IP: 10 в час — декоратором @Throttle на маршруте (см.
 * auth.controller.ts), guard считает по IP.
 *
 * In-memory осознанно: single-instance Render + демо-масштаб;
 * переход на Redis — открытый вопрос ADR 0011.
 */
import { Injectable } from '@nestjs/common';
import { ApiError } from '../common/filters/api-error';

/** 3 отправки на номер за 10 минут. */
const PHONE_LIMIT = 3;
const PHONE_WINDOW_MS = 10 * 60 * 1000;

interface SendRecord {
  sentAt: number[];
}

@Injectable()
export class OtpSendRateLimiter {
  private readonly phones = new Map<string, SendRecord>();

  /**
   * Фиксирует отправку. Сверх лимита — 429 AUTH_RATE_LIMIT
   * (код не выдаётся, SMS не отправляется).
   */
  checkAndCount(phone: string, now = Date.now()): void {
    const record = this.phones.get(phone) ?? { sentAt: [] };
    record.sentAt = record.sentAt.filter(
      (ts) => now - ts < PHONE_WINDOW_MS,
    );
    if (record.sentAt.length >= PHONE_LIMIT) {
      this.phones.set(phone, record);
      throw new ApiError(
        429,
        'AUTH_RATE_LIMIT',
        'Слишком много кодов. Подождите 10 минут',
      );
    }
    record.sentAt.push(now);
    this.phones.set(phone, record);
  }

  /** Полная очистка (тесты). */
  clear(): void {
    this.phones.clear();
  }
}
