/**
 * Одноразовые коды подтверждения (OTP).
 *
 * Хранение in-memory с TTL 5 минут — демо-режим Промта 7 (в схеме
 * Промта модель OtpCode отсутствует; переезд в БД и SMS-провайдер —
 * открытый вопрос ADR 0008 / Промт 8).
 *
 * В NODE_ENV !== 'production' код возвращается в ответе (devCode) —
 * так устроен демо-вход по OTP без SMS. В production ответ всегда
 * { sent: true } без кода.
 */
import { Injectable } from '@nestjs/common';
import { ApiError } from '../common/filters/api-error';

export type OtpPurpose = 'login' | 'password_reset';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;
/** Максимум попыток ввода одного кода. */
const OTP_MAX_ATTEMPTS = 5;

function generateCode(): string {
  // Равномерные 6 цифр без ведущих потерь: 0–999999 → padStart.
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

@Injectable()
export class OtpService {
  private readonly codes = new Map<string, OtpRecord>();

  /** Выдаёт код для телефона и назначения. Старый код заменяется. */
  issue(phone: string, purpose: OtpPurpose): string {
    const code = generateCode();
    this.codes.set(`${phone}:${purpose}`, {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });
    return code;
  }

  /**
   * Проверяет код. Неверный — ошибка AUTH_OTP_INVALID (попытки
   * считаются, после 5 — код сгорает). Просроченный — AUTH_OTP_EXPIRED.
   */
  verify(phone: string, purpose: OtpPurpose, code: string): void {
    const key = `${phone}:${purpose}`;
    const record = this.codes.get(key);

    if (!record) {
      throw new ApiError(
        400,
        'AUTH_OTP_INVALID',
        'Код не запрашивался или уже использован',
      );
    }
    if (record.expiresAt <= Date.now()) {
      this.codes.delete(key);
      throw new ApiError(400, 'AUTH_OTP_EXPIRED', 'Код истёк');
    }
    if (record.code !== code) {
      record.attempts += 1;
      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        this.codes.delete(key);
      }
      throw new ApiError(400, 'AUTH_OTP_INVALID', 'Неверный код');
    }

    // Код одноразовый.
    this.codes.delete(key);
  }

  /** Полная очистка (тесты). */
  clear(): void {
    this.codes.clear();
  }
}
