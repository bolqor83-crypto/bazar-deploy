/**
 * Тесты authStore: гидратация, вход/регистрация/OTP, синхронизация
 * с contextStore, logout с полной очисткой.
 *
 * Сервис замокан (модуль services/authMock): тесты проверяют стор,
 * а не мок-бэкенд (он покрыт собственными тестами).
 *
 * Node-окружение Jest = SSR по умолчанию (window нет). Клиентский
 * путь включается явным объявлением window.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser, Session } from '@bazar/types';
import { AuthError } from '@bazar/types';
import { authMockService } from '../services/authMock';
import {
  __resetAuthStoreForTests,
  SESSION_STORAGE_KEY,
  useAuthStore,
} from './authStore';
import { CONTEXT_STORAGE_KEY, useContextStore } from './contextStore';

jest.mock('../services/authMock');

/** Фикстура ответа мок-бэкенда. */
function makeResponse(user: AuthUser): { user: AuthUser; session: Session } {
  return {
    user,
    session: {
      userId: user.id,
      token: `token-${user.id}`,
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-01-08T00:00:00.000Z',
    },
  };
}

const IVAN: AuthUser = {
  id: 'u1',
  phone: '+79001234567',
  name: 'Иван Петров',
  createdAt: '2026-01-01T00:00:00.000Z',
  memberships: [
    {
      userId: 'u1',
      organizationId: 'o1',
      role: 'wholesale_seller',
      title: 'Владелец',
    },
    {
      userId: 'u1',
      organizationId: 'o2',
      role: 'store_owner',
      title: 'Владелец',
    },
    {
      userId: 'u1',
      organizationId: 'o3',
      role: 'store_owner',
      title: 'Управляющий',
    },
    {
      userId: 'u1',
      organizationId: 'o4',
      role: 'carrier',
      title: 'Водитель-экспедитор',
    },
  ],
};

const NEWBIE: AuthUser = {
  id: 'u2',
  phone: '+79001112233',
  name: 'Мария Иванова',
  createdAt: '2026-01-02T00:00:00.000Z',
  memberships: [],
};

type WindowHolder = { window?: unknown };

function setClientWindow() {
  (globalThis as unknown as WindowHolder).window = globalThis;
}

function deleteClientWindow() {
  delete (globalThis as unknown as WindowHolder).window;
}

/** Сброс обоих stores к исходному состоянию. */
function resetStores() {
  __resetAuthStoreForTests();
  useContextStore.setState({
    active: {
      userId: '',
      role: 'customer',
      organizationId: null,
      locationId: null,
    },
    memberships: [],
    hydrated: true,
  });
}

describe('authStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetStores();
    jest.clearAllMocks();
    // История вызовов хранилища — на чистую (реализации не трогаем:
    // mockRestore на моке модуля в Jest 30 ломает его реализацию).
    jest.mocked(AsyncStorage.getItem).mockClear();
  });

  afterEach(async () => {
    deleteClientWindow();
  });

  // ---------------------------------------------------------------------
  // hydrate
  // ---------------------------------------------------------------------

  it('hydrate без токена → unauthenticated', async () => {
    setClientWindow();
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().state).toBe('unauthenticated');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('hydrate с валидной сессией → authenticated + синхронизация контекста', async () => {
    setClientWindow();
    await AsyncStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ userId: 'u1', token: 'token-u1' }),
    );
    jest
      .mocked(authMockService.getSession)
      .mockResolvedValue(makeResponse(IVAN));

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().state).toBe('authenticated');
    expect(useAuthStore.getState().user?.id).toBe('u1');
    expect(useAuthStore.getState().token).toBe('token-u1');

    // Контекст Ивана: приоритет wholesale → организация o1
    const { active, memberships } = useContextStore.getState();
    expect(active).toEqual({
      userId: 'u1',
      role: 'wholesale_seller',
      organizationId: 'o1',
      locationId: null,
    });
    expect(memberships).toHaveLength(4);
  });

  it('hydrate сохраняет выбранный контекст того же пользователя', async () => {
    setClientWindow();
    // Пользователь уже работал в роли владельца точки o3/l4
    useContextStore.setState({
      active: {
        userId: 'u1',
        role: 'store_owner',
        organizationId: 'o3',
        locationId: 'l4',
      },
      memberships: IVAN.memberships,
      hydrated: true,
    });
    await AsyncStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ userId: 'u1', token: 'token-u1' }),
    );
    jest
      .mocked(authMockService.getSession)
      .mockResolvedValue(makeResponse(IVAN));

    await useAuthStore.getState().hydrate();
    expect(useContextStore.getState().active).toEqual({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o3',
      locationId: 'l4',
    });
  });

  it('hydrate с истёкшей сессией → unauthenticated, токен удалён', async () => {
    setClientWindow();
    await AsyncStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ userId: 'u1', token: 'expired' }),
    );
    jest.mocked(authMockService.getSession).mockResolvedValue(null);

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().state).toBe('unauthenticated');
    await expect(AsyncStorage.getItem(SESSION_STORAGE_KEY)).resolves.toBeNull();
  });

  it('hydrate на SSR → unauthenticated сразу, без хранилища', async () => {
    deleteClientWindow();
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().state).toBe('unauthenticated');
    // Ни хранилище, ни сервис сессий не трогались (у моков своя
    // история вызовов — spyOn здесь не нужен, он ломает реализацию).
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(authMockService.getSession).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------

  it('login: успех → state/user/token, контекст по приоритету членств', async () => {
    setClientWindow();
    jest.mocked(authMockService.login).mockResolvedValue(makeResponse(IVAN));

    const ok = await useAuthStore.getState().login({
      phone: '+79001234567',
      password: 'qwerty123',
    });

    expect(ok).toBe(true);
    const { state, user, token, error } = useAuthStore.getState();
    expect(state).toBe('authenticated');
    expect(user?.id).toBe('u1');
    expect(token).toBe('token-u1');
    expect(error).toBeNull();
    expect(useContextStore.getState().active).toEqual({
      userId: 'u1',
      role: 'wholesale_seller',
      organizationId: 'o1',
      locationId: null,
    });
    // Сессия сохранена
    const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    expect(stored).toContain('token-u1');
  });

  it('login: ошибка пишется в error, исключение наружу не летит', async () => {
    setClientWindow();
    jest
      .mocked(authMockService.login)
      .mockRejectedValue(
        new AuthError('AUTH_USER_NOT_FOUND', 'Пользователь не найден'),
      );

    const ok = await useAuthStore.getState().login({
      phone: '+79000000000',
      password: 'whatever1',
    });

    expect(ok).toBe(false);
    const { state, user, error } = useAuthStore.getState();
    expect(state).toBe('unknown'); // осталось прежним
    expect(user).toBeNull();
    expect(error).toBe('Неверный номер или пароль');
  });

  // ---------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------

  it('register: успех → пользователь без членств, контекст customer', async () => {
    setClientWindow();
    jest
      .mocked(authMockService.register)
      .mockResolvedValue(makeResponse(NEWBIE));

    const ok = await useAuthStore
      .getState()
      .register({
        phone: '+79001112233',
        password: 'password1',
        name: 'Мария Иванова',
      });

    expect(ok).toBe(true);
    const { state, user } = useAuthStore.getState();
    expect(state).toBe('authenticated');
    expect(user?.memberships).toEqual([]);
    expect(useContextStore.getState().active).toEqual({
      userId: 'u2',
      role: 'customer',
      organizationId: null,
      locationId: null,
    });
  });

  it('register: занятый телефон → ошибка', async () => {
    setClientWindow();
    jest
      .mocked(authMockService.register)
      .mockRejectedValue(new AuthError('AUTH_USER_EXISTS', 'Занят'));

    const ok = await useAuthStore
      .getState()
      .register({
        phone: '+79001234567',
        password: 'password1',
        name: 'Двойник',
      });

    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe(
      'Этот номер уже зарегистрирован',
    );
  });

  // ---------------------------------------------------------------------
  // loginWithOtp
  // ---------------------------------------------------------------------

  it('loginWithOtp: успех → как login, новый юзер получает customer', async () => {
    setClientWindow();
    jest
      .mocked(authMockService.loginWithOtp)
      .mockResolvedValue(makeResponse(NEWBIE));

    const ok = await useAuthStore
      .getState()
      .loginWithOtp('+79001112233', '123456');

    expect(ok).toBe(true);
    expect(useAuthStore.getState().state).toBe('authenticated');
    expect(useContextStore.getState().active.role).toBe('customer');
  });

  it('loginWithOtp: неверный код → ошибка в error', async () => {
    setClientWindow();
    jest
      .mocked(authMockService.loginWithOtp)
      .mockRejectedValue(new AuthError('AUTH_OTP_INVALID', 'Неверный код'));

    const ok = await useAuthStore
      .getState()
      .loginWithOtp('+79001234567', '000000');
    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toContain('Неверный код');
  });

  // ---------------------------------------------------------------------
  // Вспомогательные операции
  // ---------------------------------------------------------------------

  it('sendOtp и requestPasswordReset проксируют сервис', async () => {
    setClientWindow();
    jest.mocked(authMockService.sendOtp).mockResolvedValue({ sent: true });
    jest
      .mocked(authMockService.requestPasswordReset)
      .mockResolvedValue({ sent: true });

    expect(await useAuthStore.getState().sendOtp('+79001234567')).toBe(true);
    expect(
      await useAuthStore.getState().requestPasswordReset('+79001234567'),
    ).toBe(true);
    expect(authMockService.sendOtp).toHaveBeenCalledWith('+79001234567');
    expect(authMockService.requestPasswordReset).toHaveBeenCalledWith(
      '+79001234567',
    );
  });

  it('resetPassword: успех → true; провал → ошибка', async () => {
    setClientWindow();
    jest.mocked(authMockService.resetPassword).mockResolvedValue({ ok: true });
    expect(
      await useAuthStore
        .getState()
        .resetPassword('+79001234567', '123456', 'new-pass-1'),
    ).toBe(true);

    jest
      .mocked(authMockService.resetPassword)
      .mockRejectedValue(new AuthError('AUTH_OTP_EXPIRED', 'Истёк'));
    expect(
      await useAuthStore
        .getState()
        .resetPassword('+79001234567', '123456', 'new-pass-1'),
    ).toBe(false);
    expect(useAuthStore.getState().error).toContain('истёк');
  });

  it('clearError очищает ошибку', () => {
    useAuthStore.setState({ error: 'какая-то ошибка' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  // ---------------------------------------------------------------------
  // logout
  // ---------------------------------------------------------------------

  it('logout: чистит оба стора и AsyncStorage', async () => {
    setClientWindow();
    // Вход Ивана
    jest.mocked(authMockService.login).mockResolvedValue(makeResponse(IVAN));
    await useAuthStore
      .getState()
      .login({ phone: '+79001234567', password: 'qwerty123' });

    // Пользователь переключил контекст
    useContextStore.getState().setRole('store_owner');

    // Остаточные OTP-ключи от предыдущих операций
    await AsyncStorage.setItem(
      'bazar.auth.otp.+79001234567',
      '{"code":"123456"}',
    );
    // Мок-сервис: очистка OTP связана с реальным ключом хранилища,
    // чтобы проверить склейку logout → clearOtpCodes.
    jest.mocked(authMockService.clearOtpCodes).mockImplementation(async () => {
      await AsyncStorage.removeItem('bazar.auth.otp.+79001234567');
    });

    await useAuthStore.getState().logout();

    // authStore чист
    const { state, user, token, error } = useAuthStore.getState();
    expect(state).toBe('unauthenticated');
    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(error).toBeNull();

    // Сервисные вызовы
    expect(authMockService.logout).toHaveBeenCalledWith('token-u1');
    expect(authMockService.clearOtpCodes).toHaveBeenCalled();

    // AsyncStorage чист по обоим ключам и OTP
    await expect(AsyncStorage.getItem(SESSION_STORAGE_KEY)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(CONTEXT_STORAGE_KEY)).resolves.toBeNull();
    await expect(
      AsyncStorage.getItem('bazar.auth.otp.+79001234567'),
    ).resolves.toBeNull();

    // contextStore сброшен на customer без пользователя
    const ctx = useContextStore.getState();
    expect(ctx.active).toEqual({
      userId: '',
      role: 'customer',
      organizationId: null,
      locationId: null,
    });
    expect(ctx.memberships).toEqual([]);
  });
});
