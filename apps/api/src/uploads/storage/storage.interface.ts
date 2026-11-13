/**
 * Контракт хранилища медиа (Промт 10, Часть B).
 *
 * Две реализации:
 * - S3Storage — Cloudflare R2 / Backblaze B2 / AWS через
 *   @aws-sdk/s3-request-presigner (настраивается env S3_*);
 * - LocalDiskStorage — локальный диск сервера (fallback без внешних
 *   кредов; эфемерен на free-плане Render — ADR 0011).
 *
 * Контракт единый: presign выдаёт uploadUrl/publicUrl, клиент делает
 * PUT на uploadUrl. Переключение бэкенда не меняет клиента.
 */
export interface PresignedUpload {
  /** Куда клиент делает PUT файла (сигнатура совместима с S3). */
  uploadUrl: string;
  /** Публичный URL файла после загрузки. */
  publicUrl: string;
  /** Ключ объекта (uploads/<userId>/<id>.<ext>). */
  key: string;
  /** Срок жизни uploadUrl — 5 минут. */
  expiresAt: Date;
}

export interface MediaStorage {
  /** Выдать подписанную ссылку на загрузку. */
  presign(input: {
    userId: string;
    contentType: string;
    origin: string;
  }): Promise<PresignedUpload>;
}
