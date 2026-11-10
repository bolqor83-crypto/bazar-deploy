/**
 * Тесты мок-бэкенда аутентификации: регистрация, вход, OTP,
 * сброс пароля, сессии, хеширование.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser, Session } from '@bazar/types';
import { AuthError } from '@bazar/types';
import {
  OTP_KEY_PREFIX,
  RESET_OTP_KEY_PREFIX,
  SESSIONS_KEY,
  USERS_KEY,
  __resetAuthMockForTests,
  authMockService,
} from '../authMock';

const IVAN_PHONE = '+79001234567';
const IVAN_PASSWORD = 'qwerty123';

/** Прочитать OTP-код прямо из хранилища (мок печатает его в консоль). */
async function readStoredOtp(prefix: string, phone: string): Promise<string> {
  const raw = await AsyncStorage.getItem(`${prefix}${phone}`);
  if (!raw) {
    throw new Error('OTP не сохранён');
  }
  return (JSON.parse(raw) as { code: string }).code;
}

/** Прочитать запись пользователя (внутренний формат с хешем). */
async function readUserRecord(
  phone: string,
): Promise<{ passwordHash: string; salt: string }> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  const users = JSON.parse(raw ?? '{}') as Record<
    string,
    { passwordHash: string; salt: string }
  >;
  const record = users[phone];
  if (!record) {
    throw new Error(`Пользователь ${phone} не найден в хранилище`);
  }
  return record;
}

function expectAuthError(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  return promise.then(
    () => {
      throw new Error('Ожидалась ошибка AuthError');
    },
    (error: unknown) => {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe(code);
    },
  );
}

describe('authMockService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetAuthMockForTests();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Посев мок-пользователя
  // -----------------------------------------------------------------------

  it('создаёт Ивана Петрова при первом обращении (все организации Промта 3)', async () => {
    const { user } = await authMockService.login({
      phone: IVAN_PHONE,
      password: IVAN_PASSWORD,
    });
    expect(user.id).toBe('u1');
    expect(user.name).toBe('Иван Петров');
    expect(user.memberships).toHaveLength(4);
    expect(user.memberships.map((m) => m.role)).toEqual(
      expect.arrayContaining(['wholesale_seller', 'store_owner', 'carrier']),
    );
  });

  it('повторный вход под Иваном открывает те же членства', async () => {
    await authMockService.login({ phone: IVAN_PHONE, password: IVAN_PASSWORD });
    const second = await authMockService.login({
      phone: IVAN_PHONE,
      password: IVAN_PASSWORD,
    });
    expect(second.user.id).toBe('u1');
    expect(second.user.memberships).toHaveLength(4);
  });

  // -----------------------------------------------------------------------
  // Регистрация
  // -----------------------------------------------------------------------

  it('регистрирует пользователя без членств и выдаёт сессию', async () => {
    const { user, session } = await authMockService.register({
      phone: '+79001112233',
      password: 'password1',
      name: 'Мария Иванова',
    });
    expect(user.name).toBe('Мария Иванова');
    expect(user.phone).toBe('+79001112233');
    expect(user.memberships).toEqual([]);
    expect(session.token).toBeTruthy();
    expect(session.userId).toBe(user.id);
  });

  it('хеширует пароль: в хранилище нет открытого пароля', async () => {
    await authMockService.register({
      phone: '+79001112233',
      password: 'password1',
      name: 'Мария Иванова',
    });
    const raw = await AsyncStorage.getItem(USERS_KEY);
    expect(raw).not.toContain('password1');
    const record = await readUserRecord('+79001112233');
    expect(record.passwordHash).not.toBe('password1');
    expect(record.salt).toHaveLength(32); // 16 байт в hex
  });

  it('одинаковые пароли → разные хеши (индивидуальная соль)', async () => {
    await authMockService.register({
      phone: '+79001112233',
      password: 'same-pass-1',
      name: 'Первый',
    });
    await authMockService.register({
      phone: '+79004445566',
      password: 'same-pass-1',
      name: 'Второй',
    });
    const first = await readUserRecord('+79001112233');
    const second = await readUserRecord('+79004445566');
    expect(first.passwordHash).not.toBe(second.passwordHash);
    expect(first.salt).not.toBe(second.salt);
  });

  it('отклоняет занятый телефон (включая Ивана)', async () => {
    await authMockService.register({
      phone: '+79001112233',
      password: 'password1',
      name: 'Мария',
    });
    await expectAuthError(
      authMockService.register({
        phone: '+79001112233',
        password: 'password2',
        name: 'Другая',
      }),
      'AUTH_USER_EXISTS',
    );
    // Телефон мок-пользователя Ивана Петрова
    await expectAuthError(
      authMockService.register({
        phone: IVAN_PHONE,
        password: 'password1',
        name: 'Двойник',
      }),
      'AUTH_USER_EXISTS',
    );
  });

  it('валидирует поля регистрации', async () => {
    await expectAuthError(
      authMockService.register({
        phone: '+7900111223',
        password: 'password1',
        name: 'Мария',
      }),
      'AUTH_INVALID_PHONE',
    );
    await expectAuthError(
      authMockService.register({
        phone: '+79001112233',
        password: 'short',
        name: 'Мария',
      }),
      'AUTH_INVALID_PASSWORD',
    );
    await expectAuthError(
      authMockService.register({
        phone: '+79001112233',
        password: 'password1',
        name: 'М',
      }),
      'AUTH_INVALID_PASSWORD',
    );
  });

  // -----------------------------------------------------------------------
  // Логин
  // -----------------------------------------------------------------------

  it('вход: успех', async () => {
    await authMockService.register({
      phone: '+79001112233',
      password: 'password1',
      name: 'Мария',
    });
    const { user } = await authMockService.login({
      phone: '+79001112233',
      password: 'password1',
    });
    expect(user.name).toBe('Мария');
  });

  it('вход: неверный пароль', async () => {
    await expectAuthError(
      authMockService.login({ phone: IVAN_PHONE, password: 'wrong-password' }),
      'AUTH_INVALID_PASSWORD',
    );
  });

  it('вход: пользователь не найден', async () => {
    await expectAuthError(
      authMockService.login({ phone: '+79009990000', password: 'password1' }),
      'AUTH_USER_NOT_FOUND',
    );
  });

  it('вход принимает телефон с маской', async () => {
    const { user } = await authMockService.login({
      phone: '+7 (900) 123-45-67',
      password: IVAN_PASSWORD,
    });
    expect(user.id).toBe('u1');
  });

  // -----------------------------------------------------------------------
  // OTP
  // -----------------------------------------------------------------------

  it('sendOtp сохраняет код с TTL 5 минут и печатает его в __DEV__', async () => {
    await authMockService.sendOtp(IVAN_PHONE);
    const code = await readStoredOtp(OTP_KEY_PREFIX, IVAN_PHONE);
    expect(code).toMatch(/^\d{6}$/);
    expect(console.warn).toHaveBeenCalledWith(
      `[MOCK OTP] ${IVAN_PHONE}: ${code}`,
    );
  });

  it('verifyOtp: валидный код → true, неверный → false', async () => {
    await authMockService.sendOtp(IVAN_PHONE);
    const code = await readStoredOtp(OTP_KEY_PREFIX, IVAN_PHONE);
    const valid = await authMockService.verifyOtp(IVAN_PHONE, code);
    const invalid = await authMockService.verifyOtp(IVAN_PHONE, '000000');
    expect(valid).toEqual({ valid: true });
    expect(invalid).toEqual({ valid: false });
  });

  it('verifyOtp: просроченный код → false', async () => {
    await authMockService.sendOtp(IVAN_PHONE);
    const code = await readStoredOtp(OTP_KEY_PREFIX, IVAN_PHONE);

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000);
    const expired = await authMockService.verifyOtp(IVAN_PHONE, code);
    expect(expired).toEqual({ valid: false });
  });

  it('loginWithOtp: существующий пользователь (Иван)', async () => {
    await authMockService.sendOtp(IVAN_PHONE);
    const code = await readStoredOtp(OTP_KEY_PREFIX, IVAN_PHONE);
    const { user } = await authMockService.loginWithOtp(IVAN_PHONE, code);
    expect(user.id).toBe('u1');
    expect(user.memberships).toHaveLength(4);
  });

  it('loginWithOtp: новый пользователь создаётся с ролью customer', async () => {
    await authMockService.sendOtp('+79005556677');
    const code = await readStoredOtp(OTP_KEY_PREFIX, '+79005556677');
    const { user } = await authMockService.loginWithOtp('+79005556677', code);
    expect(user.name).toBe('Пользователь');
    expect(user.memberships).toEqual([]);
  });

  it('loginWithOtp: неверный и истёкший код', async () => {
    await authMockService.sendOtp(IVAN_PHONE);
    await expectAuthError(
      authMockService.loginWithOtp(IVAN_PHONE, '000000'),
      'AUTH_OTP_INVALID',
    );

    const code = await readStoredOtp(OTP_KEY_PREFIX, IVAN_PHONE);
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000);
    await expectAuthError(
      authMockService.loginWithOtp(IVAN_PHONE, code),
      'AUTH_OTP_EXPIRED',
    );
  });

  it('loginWithOtp: код одноразовый — второй вход с тем же кодом отклонён', async () => {
    await authMockService.sendOtp(IVAN_PHONE);
    const code = await readStoredOtp(OTP_KEY_PREFIX, IVAN_PHONE);
    await authMockService.loginWithOtp(IVAN_PHONE, code);
    await expectAuthError(
      authMockService.loginWithOtp(IVAN_PHONE, code),
      'AUTH_OTP_INVALID',
    );
  });

  // -----------------------------------------------------------------------
  // Сброс пароля
  // -----------------------------------------------------------------------

  it('сброс: запрос кода → подтверждение → смена хеша → вход с новым паролем', async () => {
    await authMockService.register({
      phone: '+79001112233',
      password: 'old-pass-1',
      name: 'Мария',
    });
    const before = await readUserRecord('+79001112233');

    await authMockService.requestPasswordReset('+79001112233');
    const code = await readStoredOtp(RESET_OTP_KEY_PREFIX, '+79001112233');

    const result = await authMockService.resetPassword(
      '+79001112233',
      code,
      'new-pass-1',
    );
    expect(result).toEqual({ ok: true });

    const after = await readUserRecord('+79001112233');
    expect(after.passwordHash).not.toBe(before.passwordHash);
    expect(after.salt).not.toBe(before.salt);

    const { user } = await authMockService.login({
      phone: '+79001112233',
      password: 'new-pass-1',
    });
    expect(user.name).toBe('Мария');
    await expectAuthError(
      authMockService.login({ phone: '+79001112233', password: 'old-pass-1' }),
      'AUTH_INVALID_PASSWORD',
    );
  });

  it('сброс: логин-код не подходит для сброса (раздельные TTL)', async () => {
    await authMockService.sendOtp(IVAN_PHONE);
    const loginCode = await readStoredOtp(OTP_KEY_PREFIX, IVAN_PHONE);
    await expectAuthError(
      authMockService.resetPassword(IVAN_PHONE, loginCode, 'new-pass-1'),
      'AUTH_OTP_INVALID',
    );
  });

  it('сброс: неверный код отклонён, пароль не меняется', async () => {
    await authMockService.requestPasswordReset(IVAN_PHONE);
    const before = await readUserRecord(IVAN_PHONE);
    await expectAuthError(
      authMockService.resetPassword(IVAN_PHONE, '000000', 'new-pass-1'),
      'AUTH_OTP_INVALID',
    );
    const after = await readUserRecord(IVAN_PHONE);
    expect(after.passwordHash).toBe(before.passwordHash);
  });

  // -----------------------------------------------------------------------
  // Сессии
  // -----------------------------------------------------------------------

  it('getSession: валидная сессия возвращает пользователя', async () => {
    const { session, user } = await authMockService.login({
      phone: IVAN_PHONE,
      password: IVAN_PASSWORD,
    });
    const restored = await authMockService.getSession(session.token);
    expect(restored?.user.id).toBe(user.id);
    expect(restored?.session.token).toBe(session.token);
  });

  it('getSession: истёкшая сессия → null и удаляется', async () => {
    const { session } = await authMockService.login({
      phone: IVAN_PHONE,
      password: IVAN_PASSWORD,
    });

    const now = Date.now();
    const spy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(now + 8 * 24 * 60 * 60 * 1000);
    expect(await authMockService.getSession(session.token)).toBeNull();
    spy.mockRestore();

    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    const sessions = JSON.parse(raw ?? '{}') as Record<string, Session>;
    expect(sessions[session.token]).toBeUndefined();
  });

  it('getSession: отсутствующая сессия → null', async () => {
    expect(await authMockService.getSession('no-such-token')).toBeNull();
  });

  it('logout удаляет сессию', async () => {
    const { session } = await authMockService.login({
      phone: IVAN_PHONE,
      password: IVAN_PASSWORD,
    });
    await authMockService.logout(session.token);
    expect(await authMockService.getSession(session.token)).toBeNull();
  });

  it('clearOtpCodes удаляет все выданные коды', async () => {
    await authMockService.sendOtp('+79001112233');
    await authMockService.requestPasswordReset('+79004445566');
    await authMockService.clearOtpCodes();
    expect(
      await AsyncStorage.getItem(`${OTP_KEY_PREFIX}+79001112233`),
    ).toBeNull();
    expect(
      await AsyncStorage.getItem(`${RESET_OTP_KEY_PREFIX}+79004445566`),
    ).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Публичная модель
  // -----------------------------------------------------------------------

  it('AuthResponse не содержит хеш и соль', async () => {
    const { user } = await authMockService.login({
      phone: IVAN_PHONE,
      password: IVAN_PASSWORD,
    });
    const keys = Object.keys(user as AuthUser);
    expect(keys).not.toContain('passwordHash');
    expect(keys).not.toContain('salt');
  });
});
