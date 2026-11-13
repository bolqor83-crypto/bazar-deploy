/**
 * E2E аутентификации: полный флоу токенов, OTP, сброс пароля.
 *
 * Прогон: pnpm --filter @bazar/api test:e2e (runInBand, чистая БД
 * между тестами).
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  registerUser,
  type TestApp,
} from './test-app';

describe('Аутентификация (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await clearDatabase(testApp.prisma);
  });

  it('полный флоу: register → me → refresh → logout → refresh 401', async () => {
    const registered = await registerUser(testApp.server, '+79001112233');

    // Профиль с членствами (пока пустыми).
    const me = await request(testApp.server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registered.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.phone).toBe('+79001112233');
    expect(me.body.memberships).toEqual([]);

    // Ротация refresh.
    const refreshed = await request(testApp.server)
      .post('/api/auth/refresh')
      .send({ refreshToken: registered.refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();
    expect(refreshed.body.refreshToken).not.toBe(registered.refreshToken);

    // Выход с новым refresh.
    const logout = await request(testApp.server)
      .post('/api/auth/logout')
      .send({ refreshToken: refreshed.body.refreshToken });
    expect(logout.status).toBe(200);

    // Отозванный токен больше не ротируется.
    const afterLogout = await request(testApp.server)
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken });
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.code).toBe('AUTH_REFRESH_INVALID');
  });

  it('повторное использование refresh отзывает всю семью', async () => {
    const registered = await registerUser(testApp.server, '+79001112233');
    const first = await request(testApp.server)
      .post('/api/auth/refresh')
      .send({ refreshToken: registered.refreshToken });
    expect(first.status).toBe(200);

    // Reuse старого: 401 и семья отозвана целиком.
    const reuse = await request(testApp.server)
      .post('/api/auth/refresh')
      .send({ refreshToken: registered.refreshToken });
    expect(reuse.status).toBe(401);

    const second = await request(testApp.server)
      .post('/api/auth/refresh')
      .send({ refreshToken: first.body.refreshToken });
    expect(second.status).toBe(401);
  });

  it('login: верный пароль, неверный пароль, дубль регистрации', async () => {
    await registerUser(testApp.server, '+79001112233');

    const ok = await request(testApp.server)
      .post('/api/auth/login')
      .send({ phone: '+79001112233', password: 'qwerty123' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.phone).toBe('+79001112233');
    expect(ok.body.user.passwordHash).toBeUndefined();

    const wrong = await request(testApp.server)
      .post('/api/auth/login')
      .send({ phone: '+79001112233', password: 'wrong-pass-9' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.code).toBe('AUTH_INVALID_CREDENTIALS');

    const duplicate = await request(testApp.server)
      .post('/api/auth/register')
      .send({ phone: '+79001112233', password: 'qwerty123', name: 'Дубль' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('AUTH_USER_EXISTS');
  });

  it('me без токена — 401, с мусорным токеном — 401', async () => {
    const noToken = await request(testApp.server).get('/api/auth/me');
    expect(noToken.status).toBe(401);

    const badToken = await request(testApp.server)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(badToken.status).toBe(401);
  });

  it('валидация DTO: короткий пароль и кривой телефон — 400', async () => {
    const badPassword = await request(testApp.server)
      .post('/api/auth/register')
      .send({ phone: '+79001112233', password: 'short1', name: 'Мария' });
    expect(badPassword.status).toBe(400);
    expect(badPassword.body.code).toBe('VALIDATION_ERROR');

    const badPhone = await request(testApp.server)
      .post('/api/auth/login')
      .send({ phone: '89001112233', password: 'qwerty123' });
    expect(badPhone.status).toBe(400);
  });

  it('OTP: send (devCode) → verify → токены и профиль', async () => {
    const sent = await request(testApp.server)
      .post('/api/auth/otp/send')
      .send({ phone: '+79005556677' });
    expect(sent.status).toBe(200);
    expect(sent.body.sent).toBe(true);
    expect(sent.body.devCode).toMatch(/^\d{6}$/);

    const verified = await request(testApp.server)
      .post('/api/auth/otp/verify')
      .send({ phone: '+79005556677', code: sent.body.devCode });
    expect(verified.status).toBe(200);
    expect(verified.body.user.phone).toBe('+79005556677');
    expect(verified.body.accessToken).toBeTruthy();

    // Код одноразовый.
    const replay = await request(testApp.server)
      .post('/api/auth/otp/verify')
      .send({ phone: '+79005556677', code: sent.body.devCode });
    expect(replay.status).toBe(400);
  });

  it('сброс пароля: код → новый пароль → старые сессии отозваны', async () => {
    const registered = await registerUser(testApp.server, '+79001112233');

    const sent = await request(testApp.server)
      .post('/api/auth/otp/send')
      .send({ phone: '+79001112233', purpose: 'password_reset' });
    expect(sent.status).toBe(200);

    const reset = await request(testApp.server)
      .post('/api/auth/password/reset')
      .send({
        phone: '+79001112233',
        code: sent.body.devCode,
        newPassword: 'newpass456',
      });
    expect(reset.status).toBe(200);

    // Старая сессия недействительна.
    const oldSession = await request(testApp.server)
      .post('/api/auth/refresh')
      .send({ refreshToken: registered.refreshToken });
    expect(oldSession.status).toBe(401);

    // Вход по новому паролю.
    const relogin = await request(testApp.server)
      .post('/api/auth/login')
      .send({ phone: '+79001112233', password: 'newpass456' });
    expect(relogin.status).toBe(200);
  });

  it('health: статус и версия', async () => {
    const health = await request(testApp.server).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body).toMatchObject({ status: 'ok', db: 'ok' });
    expect(typeof health.body.version).toBe('string');
    // Промт 10: расширенный health — sms/s3/uptime.
    expect(['console', 'twilio', 'none']).toContain(health.body.sms);
    expect(['ok', 'disabled']).toContain(health.body.s3);
    expect(typeof health.body.uptimeSec).toBe('number');
  });

  it('OpenAPI: /api/docs-json отдаёт спеку с Bearer-схемой', async () => {
    const docs = await request(testApp.server).get('/api/docs-json');
    expect(docs.status).toBe(200);
    expect(docs.body.openapi).toMatch(/^3\./);
    expect(Object.keys(docs.body.paths)).toContain('/api/auth/login');
    expect(Object.keys(docs.body.components.securitySchemes)).toContain(
      'bearer',
    );
  });
});
