/**
 * Unit-тесты TokenService: семейства refresh-токенов, reuse
 * detection, истечение, отзыв.
 */
import { createHash } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { TokenService } from '../../src/auth/token.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { FakePrisma } from './fake-prisma';

const TEST_SECRET = 'unit-test-secret-0123456789abcdef0123456789abcdef';

function fakeUser(prisma: FakePrisma): User {
  const created = prisma.users.get([...prisma.users.keys()][0] ?? '');
  if (created) {
    return created;
  }
  throw new Error('нет пользователей в фейке');
}

describe('TokenService (unit)', () => {
  let service: TokenService;
  let prisma: FakePrisma;
  let jwt: JwtService;

  beforeEach(async () => {
    prisma = new FakePrisma();
    jwt = new JwtService({ secret: TEST_SECRET });
    service = new TokenService(prisma as unknown as PrismaService, jwt);
    await prisma.user.create({
      data: { phone: '+79001112233', name: 'Мария', passwordHash: 'stub' },
    });
  });

  it('создаёт сессию: в БД только SHA-256-хеш токена', async () => {
    const user = fakeUser(prisma);
    const pair = await service.createSession(user, { ip: '10.0.0.1' });

    expect(pair.refreshToken).not.toContain('$');
    const expectedHash = createHash('sha256')
      .update(pair.refreshToken)
      .digest('hex');
    const stored = [...prisma.sessions.values()];
    expect(stored).toHaveLength(1);
    expect(stored[0].refreshHash).toBe(expectedHash);
    expect(stored[0].family).toMatch(/^[0-9a-f-]{36}$/);
    expect(stored[0].ip).toBe('10.0.0.1');
    expect(stored[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('ротация: старый отозван, новый — в той же семье', async () => {
    const user = fakeUser(prisma);
    const first = await service.createSession(user);
    const second = await service.rotate(first.refreshToken);

    const sessions = [...prisma.sessions.values()];
    expect(sessions).toHaveLength(2);
    const old = sessions.find(
      (s) =>
        s.refreshHash !==
        createHash('sha256').update(second.refreshToken).digest('hex'),
    );
    expect(old?.revokedAt).not.toBeNull();
    expect(sessions.every((s) => s.family === old?.family)).toBe(true);
  });

  it('повторное использование отозванного отзывает всю семью', async () => {
    const user = fakeUser(prisma);
    const first = await service.createSession(user);
    await service.rotate(first.refreshToken);
    // family из двух сессий: старая отозвана, новая активна.
    await expect(service.rotate(first.refreshToken)).rejects.toMatchObject({
      code: 'AUTH_REFRESH_INVALID',
    });
    // Вся семья отозвана — активной не осталось.
    const active = [...prisma.sessions.values()].filter(
      (s) => s.revokedAt === null,
    );
    expect(active).toHaveLength(0);
  });

  it('истёкшая сессия не ротируется', async () => {
    const user = fakeUser(prisma);
    const pair = await service.createSession(user);
    const session = [...prisma.sessions.values()][0];
    session.expiresAt = new Date(Date.now() - 1000);
    await expect(service.rotate(pair.refreshToken)).rejects.toMatchObject({
      code: 'AUTH_REFRESH_INVALID',
    });
  });

  it('неизвестный токен — 401', async () => {
    await expect(service.rotate('y'.repeat(64))).rejects.toMatchObject({
      code: 'AUTH_REFRESH_INVALID',
    });
  });

  it('revokeAllForUser отзывает все активные сессии пользователя', async () => {
    const user = fakeUser(prisma);
    await service.createSession(user);
    await service.createSession(user);
    await service.createSession(user);
    await service.revokeAllForUser(user.id);
    expect(
      [...prisma.sessions.values()].filter((s) => s.revokedAt === null),
    ).toHaveLength(0);
  });
});
