/**
 * Клиент загрузок (Промт 10, Часть B): presign + PUT файла.
 *
 * Web-сборка: файл из <input type="file"> (Blob). Presign отдаёт
 * uploadUrl (S3 или локальный режим) — PUT идёт напрямую, мимо
 * apiRequest (без Authorization: подпись уже в URL).
 */
import type { PresignedUpload } from '@bazar/types';
import { apiRequest } from './client';

/** Whitelist типов (совпадает с сервером). */
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type UploadType = (typeof UPLOAD_TYPES)[number];

/** Подписать загрузку. */
export async function presignUpload(
  contentType: UploadType,
): Promise<PresignedUpload> {
  return apiRequest<PresignedUpload>('/uploads/presign', {
    method: 'POST',
    auth: true,
    body: { contentType },
  });
}

/**
 * Загрузить файл: presign → PUT → publicUrl.
 * Бросает Error('UPLOAD_FAILED') при сбое передачи.
 */
export async function uploadImage(
  file: Blob,
  contentType: UploadType = 'image/jpeg',
): Promise<string> {
  const presigned = await presignUpload(contentType);
  const response = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!response.ok) {
    throw new Error('UPLOAD_FAILED');
  }
  return presigned.publicUrl;
}
