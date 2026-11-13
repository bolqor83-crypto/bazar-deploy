/**
 * Unit-тесты загрузок (Промт 10, Часть B): presign-валидация,
 * подпись локального хранилища, выбор бэкенда.
 */
import { UploadsService } from '../../src/uploads/uploads.service';
import {
  CONTENT_TYPE_EXT,
  KEY_PATTERN,
  LocalDiskStorage,
  UPLOAD_TTL_MS,
  verifyUploadToken,
} from '../../src/uploads/storage/local-disk.storage';
import { MEDIA_STORAGE } from '../../src/uploads/uploads.constants';

const JWT_SECRET =
  'unit-test-secret-0123456789abcdef0123456789abcdef';

function setEnv() {
  process.env.JWT_ACCESS_SECRET = JWT_SECRET;
}

describe('UploadsService (unit)', () => {
  beforeEach(() => setEnv());

  it('отклоняет недопустимый content-type', async () => {
    const service = new UploadsService(new LocalDiskStorage());
    await expect(
      service.presign({
        userId: 'u1',
        contentType: 'image/gif',
        origin: 'http://localhost:3000',
      }),
    ).rejects.toMatchObject({ response: { code: 'UPLOAD_INVALID_TYPE' } });
  });

  it('presign jpeg: ключ, ссылки, срок 5 минут', async () => {
    const service = new UploadsService(new LocalDiskStorage());
    const result = await service.presign({
      userId: 'u1',
      contentType: 'image/jpeg',
      origin: 'http://localhost:3000',
    });
    expect(result.key).toMatch(KEY_PATTERN);
    expect(result.uploadUrl).toContain('/api/uploads/direct?key=');
    expect(result.publicUrl).toContain('/api/media/uploads/u1/');
    expect(
      result.expiresAt.getTime() - Date.now(),
    ).toBeGreaterThanOrEqual(UPLOAD_TTL_MS - 1000);
  });

  it('content-type нормализуется к нижнему регистру', async () => {
    const service = new UploadsService(new LocalDiskStorage());
    const result = await service.presign({
      userId: 'u1',
      contentType: 'IMAGE/PNG',
      origin: 'http://x',
    });
    expect(result.key.endsWith('.png')).toBe(true);
  });

  it('whitelist: только jpeg/png/webp', () => {
    expect(Object.keys(CONTENT_TYPE_EXT).sort()).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
  });
});

describe('verifyUploadToken (local-disk)', () => {
  beforeEach(() => setEnv());

  it('валидная подпись проходит, токен чужого ключа — нет', async () => {
    const storage = new LocalDiskStorage();
    const presigned = await storage.presign({
      userId: 'u1',
      contentType: 'image/webp',
      origin: 'http://x',
    });
    const url = new URL(presigned.uploadUrl);
    const key = url.searchParams.get('key') ?? '';
    const expires = url.searchParams.get('expires') ?? '';
    const token = url.searchParams.get('token') ?? '';
    expect(verifyUploadToken(key, expires, token)).toBe(true);
    expect(verifyUploadToken('uploads/u2/hack.webp', expires, token)).toBe(
      false,
    );
  });

  it('просроченная подпись отклоняется', async () => {
    const storage = new LocalDiskStorage();
    const presigned = await storage.presign({
      userId: 'u1',
      contentType: 'image/png',
      origin: 'http://x',
    });
    const url = new URL(presigned.uploadUrl);
    const key = url.searchParams.get('key') ?? '';
    const token = url.searchParams.get('token') ?? '';
    const expired = String(Date.now() - 1);
    expect(verifyUploadToken(key, expired, token)).toBe(false);
  });

  it('ключ с обходом пути не проходит паттерн', () => {
    expect(KEY_PATTERN.test('uploads/u1/../../etc/passwd.jpg')).toBe(false);
    expect(KEY_PATTERN.test('uploads/u1/ok-name.jpg')).toBe(true);
  });
});

describe('токен DI', () => {
  it('MEDIA_STORAGE — стабильная строка', () => {
    expect(MEDIA_STORAGE).toBe('MEDIA_STORAGE_TOKEN');
  });
});
