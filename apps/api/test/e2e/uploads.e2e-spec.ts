/**
 * E2E загрузок: presign → PUT → GET /api/media (Промт 10, Часть B).
 *
 * Локальный режим (S3 env не задан): uploadUrl ведёт на
 * /api/uploads/direct с HMAC-подписью.
 */
import request from 'supertest';
import { readFile, stat, rm } from 'node:fs/promises';
import {
  clearDatabase,
  createTestApp,
  registerUser,
  type TestApp,
} from './test-app';

/** Минимальный валидный PNG (1×1). */
const MINIMAL_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d49444154789c626001000000ffff03000006000557',
  'hex',
);

describe('Uploads (e2e)', () => {
  let testApp: TestApp;
  let token: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    await clearDatabase(testApp.prisma);
    const user = await registerUser(testApp.server, '+79001110011');
    token = user.accessToken;
  });

  afterAll(async () => {
    // Чистим локальные файлы теста.
    await rm(`${process.cwd()}/media/uploads`, {
      recursive: true,
      force: true,
    });
    await testApp.close();
  });

  it('presign без JWT — 401', async () => {
    const response = await request(testApp.server)
      .post('/api/uploads/presign')
      .send({ contentType: 'image/png' });
    expect(response.status).toBe(401);
  });

  it('presign gif — 400 (whitelist: DTO отсекает до сервиса)', async () => {
    const response = await request(testApp.server)
      .post('/api/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'image/gif' });
    expect(response.status).toBe(400);
    // DTO IsIn отвечает VALIDATION_ERROR; сервисный
    // UPLOAD_INVALID_TYPE — защита в глубину.
    expect(['VALIDATION_ERROR', 'UPLOAD_INVALID_TYPE']).toContain(
      response.body.code,
    );
  });

  it('presign png → PUT файла → файл на диске → GET отдаёт', async () => {
    const presign = await request(testApp.server)
      .post('/api/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'image/png' });
    expect(presign.status).toBe(200);
    expect(presign.body.uploadUrl).toContain('/api/uploads/direct');
    expect(presign.body.publicUrl).toContain('/api/media/uploads/');
    expect(presign.body.key).toMatch(
      /^uploads\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.png$/,
    );

    const url = new URL(presign.body.uploadUrl);
    const upload = await request(testApp.server)
      .put(url.pathname + url.search)
      .set('Content-Type', 'image/png')
      .send(MINIMAL_PNG);
    expect(upload.status).toBe(200);
    expect(upload.body.publicUrl).toBe(`/api/media/${presign.body.key}`);

    // Файл на диске.
    const filePath = `${process.cwd()}/media/${presign.body.key}`;
    await expect(stat(filePath)).resolves.toBeTruthy();
    const written = await readFile(filePath);
    expect(written.equals(MINIMAL_PNG)).toBe(true);

    // Публичная раздача: content-type и байты.
    const serve = await request(testApp.server)
      .get(`/api/media/${presign.body.key}`);
    expect(serve.status).toBe(200);
    expect(serve.headers['content-type']).toBe('image/png');
    expect(Buffer.from(serve.body).equals(MINIMAL_PNG)).toBe(true);
  });

  it('PUT с левым токеном — 403', async () => {
    const presign = await request(testApp.server)
      .post('/api/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'image/png' });
    const url = new URL(presign.body.uploadUrl);
    const tampered = url.search.replace(
      /token=[^&]+/,
      'token=deadbeef',
    );
    const upload = await request(testApp.server)
      .put(url.pathname + tampered)
      .set('Content-Type', 'image/png')
      .send(MINIMAL_PNG);
    expect(upload.status).toBe(403);
    expect(upload.body.code).toBe('UPLOAD_INVALID_SIGNATURE');
  });

  it('PUT не того content-type — 400', async () => {
    const presign = await request(testApp.server)
      .post('/api/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'image/png' });
    const url = new URL(presign.body.uploadUrl);
    const upload = await request(testApp.server)
      .put(url.pathname + url.search)
      .set('Content-Type', 'text/html')
      .send('<html></html>');
    expect(upload.status).toBe(400);
    expect(upload.body.code).toBe('UPLOAD_INVALID_TYPE');
  });

  it('GET несуществующего файла — 404', async () => {
    const response = await request(testApp.server)
      .get('/api/media/uploads/nobody/x.png');
    expect(response.status).toBe(404);
  });
});
