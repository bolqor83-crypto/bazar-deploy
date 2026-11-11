/**
 * E2E rate limiting: 6-й login за минуту — 429 с русским текстом.
 *
 * Отдельный файл: включает throttler динамически (сброс кэша ENV),
 * поднимает собственное приложение и закрывает его — in-memory
 * бакеты не протекают в остальные e2e.
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  registerUser,
  type TestApp,
} from './test-app';
import { __resetEnvCacheForTests } from '../../src/config/env';

describe('Rate limiting (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    process.env.THROTTLER_DISABLED = 'false';
    __resetEnvCacheForTests();
    testApp = await createTestApp();
    // Файлы e2e делят одну БД: чистим остатки предыдущего файла.
    await clearDatabase(testApp.prisma);
    await registerUser(testApp.server, '+79001112233');
  });

  afterAll(async () => {
    await testApp.close();
    process.env.THROTTLER_DISABLED = 'true';
    __resetEnvCacheForTests();
  });

  it('6-я попытка login за минуту — 429 AUTH_RATE_LIMIT', async () => {
    const attempts: { status: number; code?: string }[] = [];
    for (let i = 0; i < 6; i += 1) {
      const response = await request(testApp.server)
        .post('/api/auth/login')
        .send({ phone: '+79001112233', password: 'wrong-pass-9' });
      attempts.push({
        status: response.status,
        code: response.body?.code,
      });
    }
    expect(attempts.slice(0, 5).every((a) => a.status === 401)).toBe(true);
    expect(attempts[5].status).toBe(429);
    expect(attempts[5].code).toBe('AUTH_RATE_LIMIT');
  });

  it('register и otp/send делят отдельные бакеты', async () => {
    // login исчерпан, но otp/send имеет свой бакет 5/мин.
    const otp = await request(testApp.server)
      .post('/api/auth/otp/send')
      .send({ phone: '+79005556677' });
    expect(otp.status).toBe(200);
  });
});
