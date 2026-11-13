/**
 * Локальное дисковое хранилище (fallback Промта 10, Часть B).
 *
 * presign выдаёт uploadUrl на собственный API-маршрут
 * PUT /api/uploads/direct с HMAC-подписью (ключ + срок 5 минут);
 * файлы лежат в MEDIA_DIR (по умолчанию <cwd>/media) и раздаются
 * публичным GET /api/media/<key>. Семантика совместима с S3 presign:
 * клиенту не важно, куда уходит PUT.
 *
 * Подпись: HMAC-SHA256 от "key:expiresAt" секретом JWT_ACCESS_SECRET.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { loadEnv } from '../../config/env';
import type { MediaStorage, PresignedUpload } from './storage.interface';

/** Срок жизни ссылки на загрузку. */
export const UPLOAD_TTL_MS = 5 * 60 * 1000;

/** Расширения по content-type (whitelist). */
export const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isAllowedContentType(contentType: string): boolean {
  return Object.prototype.hasOwnProperty.call(CONTENT_TYPE_EXT, contentType);
}

/** Ключи вида uploads/<userId>/<cuid>.<ext> — без обхода путей. */
export const KEY_PATTERN = /^uploads\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.(jpg|png|webp)$/;

/** Каталог медиа на диске. */
export function mediaDir(): string {
  const configured = loadEnv().MEDIA_DIR;
  return configured || `${process.cwd()}/media`;
}

function sign(key: string, expiresAtMs: number): string {
  const secret = loadEnv().JWT_ACCESS_SECRET;
  return createHmac('sha256', secret).update(`${key}:${expiresAtMs}`).digest('hex');
}

export function verifyUploadToken(
  key: string,
  expiresAtMs: string,
  token: string,
): boolean {
  const expires = Number(expiresAtMs);
  if (!Number.isFinite(expires) || expires <= Date.now()) {
    return false;
  }
  if (!KEY_PATTERN.test(key)) {
    return false;
  }
  const expected = sign(key, expires);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(token, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

@Injectable()
export class LocalDiskStorage implements MediaStorage {
  async presign(input: {
    userId: string;
    contentType: string;
    origin: string;
  }): Promise<PresignedUpload> {
    const ext = CONTENT_TYPE_EXT[input.contentType];
    const key = `uploads/${input.userId}/${crypto.randomUUID()}.${ext}`;
    const expiresAt = new Date(Date.now() + UPLOAD_TTL_MS);
    const token = sign(key, expiresAt.getTime());
    const uploadUrl =
      `${input.origin}/api/uploads/direct` +
      `?key=${encodeURIComponent(key)}&expires=${expiresAt.getTime()}&token=${token}`;
    return {
      uploadUrl,
      publicUrl: `${input.origin}/api/media/${key}`,
      key,
      expiresAt,
    };
  }
}
