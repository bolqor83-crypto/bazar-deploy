/**
 * Unit-тесты AuthService: register/login/refresh/logout/OTP/reset.
 *
 * Prisma подменён in-memory фейком; TokenService, OtpService и
 * JwtService — реальные (проверяется связная логика токенов).
 */
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { AuthService } from '../../src/auth/auth.service';
import { OtpService } from '../../src/auth/otp.service';
import { TokenService } from '../../src/auth/token.service';
import { verifyPassword } from '../../src/auth/password';
import { AppLogger } from '../../src/common/app-logger';
import { ApiError } from '../../src/common/filters/api-error';
import { PrismaService } from '../../src/prisma/prisma.service';
import { FakePrisma } from './fake-prisma';

const TEST_SECRET = 'unit-test-secret-0123456789abcdef0123456789abcdef';

describe('AuthService (unit)', () => {
  let service: AuthService;
  let tokens: TokenService;
  let otp: OtpService;
  let prisma: FakePrisma;
  let jwt: JwtService;

  beforeEach(() => {
    prisma = new FakePrisma();
    jwt = new JwtService({ secret: TEST_SECRET });
    tokens = new TokenService(prisma as unknown as PrismaService, jwt);
    otp = new OtpService();
    service = new AuthService(
      prisma as unknown as PrismaService,
      tokens,
      otp,
      new AppLogger(),
    );
  });

  describe('register', () => {
    it('создаёт пользователя с хешем Argon2id и отдаёт токены', async () => {
      const result = await service.register(
        { phone: '+79001112233', password: 'qwerty123', name: 'Мария' },
        {},
      );

      expect(result.user.phone).toBe('+79001112233');
      expect(result.user.name).toBe('Мария');
      // Пароль и хеш не покидают сервер.
      const serialized = JSON.stringify(result.user);
      expect(serialized).not.toContain('qwerty123');
      expect(serialized).not.toContain('passwordHash');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toHaveLength(43); // 32 байта base64url

      const stored = prisma.users.get(result.user.id);
      expect(stored).toBeDefined();
      expect(stored?.passwordHash).not.toBe('qwerty123');
      expect(stored?.passwordHash.startsWith('$argon2')).toBe(true);
      await expect(
        verifyPassword(stored?.passwordHash ?? '', 'qwerty123'),
      ).resolves.toBe(true);
      await expect(
        verifyPassword(stored?.passwordHash ?? '', 'wrong-pass-9'),
      ).resolves.toBe(false);
    });

    it('подписывает access-JWT с sub = userId', async () => {
      const result = await service.register(
        { phone: '+79001112233', password: 'qwerty123', name: 'Мария' },
        {},
      );
      const payload = jwt.verify<{ sub: string }>(result.accessToken);
      expect(payload.sub).toBe(result.user.id);
    });

    it('отказывает при повторной регистрации телефона', async () => {
      const dto = {
        phone: '+79001112233',
        password: 'qwerty123',
        name: 'Мария',
      };
      await service.register(dto, {});
      await expect(service.register(dto, {})).rejects.toMatchObject({
        code: 'AUTH_USER_EXISTS',
      });
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.register(
        { phone: '+79001112233', password: 'qwerty123', name: 'Мария' },
        {},
      );
    });

    it('входит по верному паролю', async () => {
      const result = await service.login(
        { phone: '+79001112233', password: 'qwerty123' },
        { ip: '127.0.0.1', userAgent: 'jest' },
      );
      expect(result.user.phone).toBe('+79001112233');
      expect(result.accessToken).toBeTruthy();
      // Сессия хранит метаданные устройства для аудита.
      const session = [...prisma.sessions.values()].find(
        (s) => s.userAgent === 'jest',
      );
      expect(session?.ip).toBe('127.0.0.1');
      expect(session?.refreshHash).not.toBe(result.refreshToken);
    });

    it('отказывает при неверном пароле (единый код)', async () => {
      await expect(
        service.login({ phone: '+79001112233', password: 'wrong-pass-9' }, {}),
      ).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
    });

    it('отказывает при неизвестном телефоне тем же кодом', async () => {
      await expect(
        service.login({ phone: '+79009998877', password: 'qwerty123' }, {}),
      ).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
    });
  });

  describe('refresh (ротация и reuse detection)', () => {
    it('ротирует пару токенов: старый отозван, новый работает', async () => {
      const registered = await service.register(
        { phone: '+79001112233', password: 'qwerty123', name: 'Мария' },
        {},
      );
      const first = await service.refresh(registered.refreshToken);
      expect(first.accessToken).toBeTruthy();
      expect(first.refreshToken).not.toBe(registered.refreshToken);

      // Старый отозван — повторное использование.
      await expect(
        service.refresh(registered.refreshToken),
      ).rejects.toMatchObject({ code: 'AUTH_REFRESH_INVALID' });

      // Новая семья: второй токен тоже отозван (reuse → вся семья).
      await expect(service.refresh(first.refreshToken)).rejects.toMatchObject({
        code: 'AUTH_REFRESH_INVALID',
      });
    });

    it('отказывает по неизвестному токену', async () => {
      await expect(service.refresh('x'.repeat(64))).rejects.toMatchObject({
        code: 'AUTH_REFRESH_INVALID',
      });
    });
  });

  describe('logout', () => {
    it('отзывает сессию и идемпотентен', async () => {
      const registered = await service.register(
        { phone: '+79001112233', password: 'qwerty123', name: 'Мария' },
        {},
      );
      await expect(
        service.logout(registered.refreshToken),
      ).resolves.toBeUndefined();
      // Повторный logout того же токена — не ошибка.
      await expect(
        service.logout(registered.refreshToken),
      ).resolves.toBeUndefined();
      // После отзыва токен не ротируется.
      await expect(
        service.refresh(registered.refreshToken),
      ).rejects.toMatchObject({ code: 'AUTH_REFRESH_INVALID' });
    });
  });

  describe('me', () => {
    it('возвращает профиль с членствами и организациями', async () => {
      const user = await prisma.user.create({
        data: {
          phone: '+79001112233',
          name: 'Мария',
          passwordHash: 'stub',
        },
      });
      const org = await prisma.organization.create({
        data: { name: 'Сеть «У дома»', type: 'RETAIL' },
      });
      await prisma.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'STORE_OWNER',
        },
      });
      await prisma.businessLocation.create({
        data: {
          organizationId: org.id,
          name: 'Точка на Садовой',
          address: 'ул. Садовая, 12',
          city: 'Ростов-на-Дону',
        },
      });

      const profile = await service.me(user.id);
      expect(profile.memberships).toHaveLength(1);
      expect(profile.memberships[0].role).toBe('store_owner');
      expect(profile.memberships[0].organization.shortName).toBe('У дома');
      expect(profile.memberships[0].locations).toHaveLength(1);
      expect(profile.memberships[0].locations[0].city).toBe('Ростов-на-Дону');
    });
  });

  describe('OTP', () => {
    it('send возвращает devCode в dev-режиме', async () => {
      const result = await service.sendOtp('+79001112233', 'login');
      expect(result.sent).toBe(true);
      expect(result.devCode).toMatch(/^\d{6}$/);
    });

    it('verify входит по коду и создаёт нового пользователя', async () => {
      const { devCode } = await service.sendOtp('+79005556677', 'login');
      expect(devCode).toBeDefined();
      const result = await service.verifyOtp(
        { phone: '+79005556677', code: devCode as string },
        {},
      );
      expect(result.user.phone).toBe('+79005556677');
      expect(result.user.memberships).toEqual([]);
      expect(result.accessToken).toBeTruthy();
      // Созданному по OTP парольный вход недоступен.
      const stored: User | undefined = prisma.users.get(result.user.id);
      expect(stored?.passwordHash.startsWith('$argon2')).toBe(true);
      await expect(
        service.login({ phone: '+79005556677', password: 'qwerty123' }, {}),
      ).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
    });

    it('verify отказывает при неверном коде', async () => {
      await service.sendOtp('+79005556677', 'login');
      await expect(
        service.verifyOtp({ phone: '+79005556677', code: '000000' }, {}),
      ).rejects.toMatchObject({ code: 'AUTH_OTP_INVALID' });
    });

    it('verify отказывает при просроченном коде', async () => {
      jest.useFakeTimers();
      const { devCode } = await service.sendOtp('+79005556677', 'login');
      jest.advanceTimersByTime(6 * 60 * 1000);
      await expect(
        service.verifyOtp(
          { phone: '+79005556677', code: devCode as string },
          {},
        ),
      ).rejects.toMatchObject({ code: 'AUTH_OTP_EXPIRED' });
      jest.useRealTimers();
    });
  });

  describe('password/reset', () => {
    it('меняет пароль, отзывает сессии и выдаёт новые токены', async () => {
      const registered = await service.register(
        { phone: '+79001112233', password: 'qwerty123', name: 'Мария' },
        {},
      );
      const { devCode } = await service.sendOtp(
        '+79001112233',
        'password_reset',
      );

      const result = await service.resetPassword(
        {
          phone: '+79001112233',
          code: devCode as string,
          newPassword: 'newpass456',
        },
        {},
      );
      expect(result.accessToken).toBeTruthy();

      // Старая сессия отозвана.
      await expect(
        service.refresh(registered.refreshToken),
      ).rejects.toMatchObject({ code: 'AUTH_REFRESH_INVALID' });

      // Вход по новому паролю.
      await expect(
        service.login({ phone: '+79001112233', password: 'newpass456' }, {}),
      ).resolves.toMatchObject({ user: { phone: '+79001112233' } });
    });

    it('отказывает по коду входа вместо кода сброса', async () => {
      await service.register(
        { phone: '+79001112233', password: 'qwerty123', name: 'Мария' },
        {},
      );
      const { devCode } = await service.sendOtp('+79001112233', 'login');
      await expect(
        service.resetPassword(
          {
            phone: '+79001112233',
            code: devCode as string,
            newPassword: 'newpass456',
          },
          {},
        ),
      ).rejects.toBeInstanceOf(ApiError);
    });
  });
});
