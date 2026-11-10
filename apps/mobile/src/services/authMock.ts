/**
 * Мок-бэкенд аутентификации Bazar.
 *
 * // MOCK ONLY. Реальный бэкенд — Промт 6.
 *
 * Пользователи, сессии и OTP-коды хранятся в AsyncStorage. Пароли
 * не хранятся в открытом виде: SHA-256 от (пароль + соль), соль —
 * 16 случайных байт (hex) на пользователя.
 *
 * Каждая операция имитирует задержку сети (300–700 мс) только в
 * браузере; на SSR и в тестах (node-окружение без window) — без
 * задержки.
 *
 * Токен — случайный UUID: это НЕ JWT, проверка подписи отсутствует.
 * // MOCK ONLY. Реальный бэкенд с JWT + refresh — Промт 6.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  AuthError as AuthErrorClass,
  type AuthErrorCode,
  type AuthUser,
  type Membership,
  type Session,
} from '@bazar/types';
import { mockMemberships } from '../mocks/context';

// ---------------------------------------------------------------------------
// Типы
// ---------------------------------------------------------------------------

export interface RegisterData {
  phone: string;
  password: string;
  name: string;
}

export interface LoginData {
  phone: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  session: Session;
}

/** Внутренняя запись пользователя: публичные данные + секрет хеша. */
type UserRecord = AuthUser & { passwordHash: string; salt: string };

/** Записи пользователей: ключ — телефон в E.164. */
type UserStorage = Record<string, UserRecord>;

/** Сессии: ключ — токен. */
type SessionStorage = Record<string, Session>;

/** OTP-код с истечением. */
interface OtpRecord {
  code: string;
  expiresAt: string;
}

export { AuthErrorClass as AuthError };

// ---------------------------------------------------------------------------
// Константы хранилища
// ---------------------------------------------------------------------------

export const USERS_KEY = 'bazar.auth.users';
export const SESSIONS_KEY = 'bazar.auth.sessions';
/** Логин-OTP: bazar.auth.otp.<phone>. */
export const OTP_KEY_PREFIX = 'bazar.auth.otp.';
/** OTP сброса пароля: отдельный TTL, отдельный префикс. */
export const RESET_OTP_KEY_PREFIX = 'bazar.auth.reset-otp.';
/** Индекс выданных OTP-ключей — для полной очистки при logout. */
const OTP_INDEX_KEY = 'bazar.auth.otp.index';

const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Мок-пользователь для разработки. */
const MOCK_USER = {
  id: 'u1',
  phone: '+79001234567',
  password: 'qwerty123',
  name: 'Иван Петров',
} as const;

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Задержка сети: только в браузере, имитация 300–700 мс. */
async function imitateNetwork(): Promise<void> {
  if (typeof window === 'undefined') {
    // SSR и тесты: не блокируем.
    return;
  }
  await delay(300 + Math.random() * 400);
}

function fail(code: AuthErrorCode, message: string): never {
  throw new AuthErrorClass(code, message);
}

/** Нормализация телефона: допускает ввод с маской, приводит к +7XXXXXXXXXX. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 11 || digits[0] !== '7') {
    return null;
  }
  return `+${digits}`;
}

function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8;
}

function isValidName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 2;
}

/** Хеш пароля: SHA-256 от (пароль + соль). Соль уникальна на пользователя. */
async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${password}${salt}`,
  );
}

/** Соль: 16 случайных байт в hex. */
function makeSalt(): string {
  return bytesToHex(Crypto.getRandomBytes(16));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Токен сессии. // MOCK ONLY: не JWT, без подписи. Реальный — Промт 6. */
function makeToken(): string {
  return Crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

async function readUsers(): Promise<UserStorage> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as UserStorage;
  } catch {
    return {};
  }
}

async function writeUsers(users: UserStorage): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function readSessions(): Promise<SessionStorage> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as SessionStorage;
  } catch {
    return {};
  }
}

async function writeSessions(sessions: SessionStorage): Promise<void> {
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

/** Публичное представление записи (без хеша и соли). */
function toAuthUser(record: UserRecord): AuthUser {
  const { passwordHash: _passwordHash, salt: _salt, ...user } = record;
  return user;
}

async function findByUserId(
  users: UserStorage,
  userId: string,
): Promise<UserRecord | null> {
  const record = Object.values(users).find((u) => u.id === userId);
  return record ?? null;
}

// ---------------------------------------------------------------------------
// Посев мок-пользователя (Иван Петров)
// ---------------------------------------------------------------------------

let seedPromise: Promise<void> | null = null;

/**
 * Создаёт мок-пользователя при первом обращении к сервису.
 * // MOCK ONLY: сидирование дев-данных. Реальный бэкенд — Промт 6.
 */
async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedInternal().catch((error: unknown) => {
      // При сбое посева — разрешаем повторную попытку.
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

async function seedInternal(): Promise<void> {
  const users = await readUsers();
  if (users[MOCK_USER.phone]) {
    return;
  }
  const salt = makeSalt();
  const passwordHash = await hashPassword(MOCK_USER.password, salt);
  users[MOCK_USER.phone] = {
    id: MOCK_USER.id,
    phone: MOCK_USER.phone,
    name: MOCK_USER.name,
    createdAt: nowIso(),
    memberships: mockMemberships satisfies Membership[],
    passwordHash,
    salt,
  };
  await writeUsers(users);
}

// ---------------------------------------------------------------------------
// OTP
// ---------------------------------------------------------------------------

/** Ключ OTP: kind 'login' | 'reset', отдельные записи и TTL. */
function otpKey(kind: 'login' | 'reset', phone: string): string {
  return `${kind === 'login' ? OTP_KEY_PREFIX : RESET_OTP_KEY_PREFIX}${phone}`;
}

async function rememberOtpKey(key: string): Promise<void> {
  const raw = await AsyncStorage.getItem(OTP_INDEX_KEY);
  const index: string[] = raw ? (JSON.parse(raw) as string[]) : [];
  if (!index.includes(key)) {
    index.push(key);
    await AsyncStorage.setItem(OTP_INDEX_KEY, JSON.stringify(index));
  }
}

/** Генерирует и сохраняет 6-значный код. */
async function issueOtp(
  kind: 'login' | 'reset',
  phone: string,
): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const key = otpKey(kind, phone);
  const record: OtpRecord = {
    code,
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  };
  await AsyncStorage.setItem(key, JSON.stringify(record));
  await rememberOtpKey(key);

  // Код в консоль — только в dev-сборке. В production — ничего.
  if (__DEV__) {
    console.warn(`[MOCK OTP] ${phone}: ${code}`);
  }
  return code;
}

/** Проверяет код: не истёк и совпадает. Бросает AuthError при промахе. */
async function consumeOtp(
  kind: 'login' | 'reset',
  phone: string,
  code: string,
): Promise<void> {
  const key = otpKey(kind, phone);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    fail('AUTH_OTP_INVALID', 'Код не запрашивался');
  }
  const record = JSON.parse(raw) as OtpRecord;
  if (Date.now() > Date.parse(record.expiresAt)) {
    await AsyncStorage.removeItem(key);
    fail('AUTH_OTP_EXPIRED', 'Код истёк');
  }
  if (record.code !== code) {
    fail('AUTH_OTP_INVALID', 'Неверный код');
  }
  // Одноразовый код: после успешной проверки удаляем.
  await AsyncStorage.removeItem(key);
}

// ---------------------------------------------------------------------------
// Сессии
// ---------------------------------------------------------------------------

async function createSession(userId: string): Promise<Session> {
  const sessions = await readSessions();
  const session: Session = {
    userId,
    token: makeToken(),
    issuedAt: nowIso(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  sessions[session.token] = session;
  await writeSessions(sessions);
  return session;
}

// ---------------------------------------------------------------------------
// Сервис
// ---------------------------------------------------------------------------

export const authMockService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    await imitateNetwork();
    await ensureSeeded();

    const phone = normalizePhone(data.phone);
    if (!phone) {
      fail('AUTH_INVALID_PHONE', 'Телефон должен быть 11 цифр, начиная с 7');
    }
    if (!isValidName(data.name)) {
      fail('AUTH_INVALID_PASSWORD', 'Имя слишком короткое');
    }
    if (!isValidPassword(data.password)) {
      fail('AUTH_INVALID_PASSWORD', 'Пароль короче 8 символов');
    }

    const users = await readUsers();
    if (users[phone]) {
      fail('AUTH_USER_EXISTS', 'Этот номер уже зарегистрирован');
    }

    const salt = makeSalt();
    const passwordHash = await hashPassword(data.password, salt);
    const user: UserRecord = {
      id: Crypto.randomUUID(),
      phone,
      name: data.name.trim(),
      createdAt: nowIso(),
      memberships: [],
      passwordHash,
      salt,
    };
    users[phone] = user;
    await writeUsers(users);

    const session = await createSession(user.id);
    return { user: toAuthUser(user), session };
  },

  async login(data: LoginData): Promise<AuthResponse> {
    await imitateNetwork();
    await ensureSeeded();

    const phone = normalizePhone(data.phone);
    if (!phone) {
      fail('AUTH_INVALID_PHONE', 'Телефон должен быть 11 цифр, начиная с 7');
    }
    if (!isValidPassword(data.password)) {
      fail('AUTH_INVALID_PASSWORD', 'Пароль короче 8 символов');
    }

    const users = await readUsers();
    const record = users[phone];
    if (!record) {
      fail('AUTH_USER_NOT_FOUND', 'Пользователь не найден');
    }

    const passwordHash = await hashPassword(data.password, record.salt);
    if (passwordHash !== record.passwordHash) {
      fail('AUTH_INVALID_PASSWORD', 'Неверный пароль');
    }

    const session = await createSession(record.id);
    return { user: toAuthUser(record), session };
  },

  async sendOtp(phone: string): Promise<{ sent: true }> {
    await imitateNetwork();
    // Посев мок-пользователя — при первом вызове сервиса (ТЗ §3).
    await ensureSeeded();
    const normalized = normalizePhone(phone);
    if (!normalized) {
      fail('AUTH_INVALID_PHONE', 'Телефон должен быть 11 цифр, начиная с 7');
    }
    await issueOtp('login', normalized);
    return { sent: true };
  },

  async verifyOtp(phone: string, code: string): Promise<{ valid: boolean }> {
    await imitateNetwork();
    await ensureSeeded();
    const normalized = normalizePhone(phone);
    if (!normalized) {
      fail('AUTH_INVALID_PHONE', 'Телефон должен быть 11 цифр, начиная с 7');
    }
    const key = otpKey('login', normalized);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return { valid: false };
    }
    const record = JSON.parse(raw) as OtpRecord;
    if (Date.now() > Date.parse(record.expiresAt)) {
      return { valid: false };
    }
    return { valid: record.code === code };
  },

  async loginWithOtp(phone: string, code: string): Promise<AuthResponse> {
    await imitateNetwork();
    await ensureSeeded();

    const normalized = normalizePhone(phone);
    if (!normalized) {
      fail('AUTH_INVALID_PHONE', 'Телефон должен быть 11 цифр, начиная с 7');
    }

    await consumeOtp('login', normalized, code);

    const users = await readUsers();
    let record = users[normalized];
    if (!record) {
      // Новый пользователь по OTP: роль customer, без организаций.
      // // MOCK ONLY: автосоздание без реальной верификации SMS — Промт 6.
      record = {
        id: Crypto.randomUUID(),
        phone: normalized,
        name: 'Пользователь',
        createdAt: nowIso(),
        memberships: [],
        passwordHash: '',
        salt: '',
      };
      users[normalized] = record;
      await writeUsers(users);
    }

    const session = await createSession(record.id);
    return { user: toAuthUser(record), session };
  },

  async requestPasswordReset(phone: string): Promise<{ sent: true }> {
    await imitateNetwork();
    await ensureSeeded();
    const normalized = normalizePhone(phone);
    if (!normalized) {
      fail('AUTH_INVALID_PHONE', 'Телефон должен быть 11 цифр, начиная с 7');
    }
    // Код выдаём даже на незарегистрированный номер — не раскрываем
    // наличие аккаунта. Подтверждение всё равно проверит запись.
    await issueOtp('reset', normalized);
    return { sent: true };
  },

  async resetPassword(
    phone: string,
    otp: string,
    newPassword: string,
  ): Promise<{ ok: true }> {
    await imitateNetwork();
    await ensureSeeded();

    const normalized = normalizePhone(phone);
    if (!normalized) {
      fail('AUTH_INVALID_PHONE', 'Телефон должен быть 11 цифр, начиная с 7');
    }
    if (!isValidPassword(newPassword)) {
      fail('AUTH_INVALID_PASSWORD', 'Пароль короче 8 символов');
    }

    await consumeOtp('reset', normalized, otp);

    const users = await readUsers();
    const record = users[normalized];
    if (!record) {
      fail('AUTH_USER_NOT_FOUND', 'Пользователь не найден');
    }

    const salt = makeSalt();
    record.salt = salt;
    record.passwordHash = await hashPassword(newPassword, salt);
    users[normalized] = record;
    await writeUsers(users);
    return { ok: true };
  },

  async getSession(token: string): Promise<AuthResponse | null> {
    // Гидратация сессии — без искусственной задержки: старт приложения
    // не должен ждать «сеть».
    await ensureSeeded();

    const sessions = await readSessions();
    const session = sessions[token];
    if (!session) {
      return null;
    }
    if (Date.now() > Date.parse(session.expiresAt)) {
      delete sessions[token];
      await writeSessions(sessions);
      return null;
    }

    const users = await readUsers();
    const record = await findByUserId(users, session.userId);
    if (!record) {
      return null;
    }
    return { user: toAuthUser(record), session };
  },

  async logout(token: string): Promise<void> {
    await imitateNetwork();
    const sessions = await readSessions();
    delete sessions[token];
    await writeSessions(sessions);
  },

  /** Полная очистка OTP-ключей (вызывается при logout пользователя). */
  async clearOtpCodes(): Promise<void> {
    const raw = await AsyncStorage.getItem(OTP_INDEX_KEY);
    const index: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    await Promise.all(index.map((key) => AsyncStorage.removeItem(key)));
    await AsyncStorage.removeItem(OTP_INDEX_KEY);
  },
};

/** Только для тестов: сброс кеша посева (после очистки AsyncStorage). */
export function __resetAuthMockForTests(): void {
  seedPromise = null;
}
