/**
 * Сервис загрузок (Промт 10, Часть B).
 *
 * Выбор бэкенда: env S3_BUCKET (+ ключи) → S3Storage, иначе
 * LocalDiskStorage. Единая валидация: whitelist content-type
 * (jpeg/png/webp), ограничение размера ≤5 МБ.
 */
import { Inject, Injectable } from '@nestjs/common';
import { ApiError } from '../common/filters/api-error';
import { MEDIA_STORAGE } from './uploads.constants';
import type { MediaStorage, PresignedUpload } from './storage/storage.interface';
import { isAllowedContentType } from './storage/local-disk.storage';

/** Максимум размера файла — 5 МБ. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UploadsService {
  constructor(
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
  ) {}

  /** Подписать загрузку. Валидация типа — до похода в бэкенд. */
  async presign(input: {
    userId: string;
    contentType: string;
    origin: string;
  }): Promise<PresignedUpload> {
    const contentType = input.contentType.toLowerCase();
    if (!isAllowedContentType(contentType)) {
      throw new ApiError(
        400,
        'UPLOAD_INVALID_TYPE',
        'Допустимы только JPEG, PNG и WebP',
      );
    }
    return this.storage.presign({ ...input, contentType });
  }

  /** Проверка размера (Content-Length, до чтения тела). */
  assertSize(contentLength: number | undefined): void {
    if (
      typeof contentLength === 'number' &&
      contentLength > MAX_UPLOAD_BYTES
    ) {
      throw new ApiError(
        413,
        'UPLOAD_TOO_LARGE',
        'Файл больше 5 МБ',
      );
    }
  }
}
