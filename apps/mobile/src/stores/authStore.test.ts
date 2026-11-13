/**
 * Тесты authStore (Промт 7: реальный API).
 *
 * Мок authApi (модуль services/api/authApi) и точечный spy на
 * client.tryRefresh: стор проверяется в связке с клиентом, но без
 * сети. Гидратация — через refresh-токен: access восстанавливается
 * только в памяти.
 *
 * Node-окружение Jest = SSR по умолчанию (window нет). Клиентский
 * путь включается явным объявлением window.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '@bazar/types';
import { AuthError } from '@bazar/types';
import * as client from '../services/api/client';
import { REFRESH_TOKEN_KEY } from '../services/storage/tokenStorage';
import { authApi, type AuthResult } from '../services/api/authApi';
import { __resetAuthStoreForTests, useAuthStore } from './authStore';
import { useContextStore } from './contextStore';

jest.mock('../services/api/authApi');

/** Фикстура ответа API: мир Ивана как из /auth/me. */
function makeResult(user: AuthUser): AuthResult {
  return {
    user,
    accessToken: `access-${user.id}`,
    refreshToken: `refresh-${user.id}`,
    world: {
      memberships: user.memberships,
      organizations: [
        { id: 'o1', name: 'Опт-Юг', shortName: 'Опт-Юг', kind: 'wholesale' },
        {
          id: 'o2',
          name: 'Сеть «У дома»',
          shortName: 'У дома',
          kind: 'retail',
        },
        {
          id: 'o3',
          name: 'Магазин «Ромашка»',
          shortName: 'Ромашка',
          kind: 'retail',
        },
        {
          id: 'o4',
          name: 'Транс-Логистик',
          shortName: 'Транс-Логистик',
          kind: 'logistics',
        },
      ],
      locations: [
        {
          id: 'l1',
          organizationId: 'o2',
          name: 'Точка на Садовой',
          shortName: 'Точка на Садовой',
          address: 'ул. Садовая, 12',
        },
        {
          id: 'l2',
          organizationId: 'o2',
          name: 'Точка на Доватора',
          shortName: 'Точка на Доватора',
          address: 'ул. Доватора, 45',
        },
        {
          id: 'l3',
          organizationId: 'o2',
          name: 'Точка в Аксае',
          shortName: 'Точка в Аксае',
          address: 'г. Аксай, пр. Ленина, 3',
        },
        {
          id: 'l4',
          organizationId: 'o3',
          name: 'Ромашка — главный зал',
          shortName: 'Главный зал',
          address: 'ул. Большая Садовая, 101',
        },
      ],
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
  let tryRefreshSpy: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    (SecureStore as unknown as { __store: Map<string, string> }).__store.clear();
    resetStores();
    jest.clearAllMocks();
    tryRefreshSpy = jest.spyOn(client, 'tryRefresh').mockResolvedValue(false);
  });

  afterEach(async () => {
    tryRefreshSpy.mockRestore();
    deleteClientWindow();
  });

  // ---------------------------------------------------------------------
  // hydrate
  // ---------------------------------------------------------------------

  it('hydrate без refresh-токена → unauthenticated', async () => {
    setClientWindow();
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().state).toBe('unauthenticated');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('hydrate с валидным refresh → authenticated + контекст по приоритету', async () => {
    setClientWindow();
    // Legacy-токен из Промтов 7–9: лежит в AsyncStorage.
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-u1');
    tryRefreshSpy.mockResolvedValue(true);
    jest.mocked(authApi.getSession).mockResolvedValue(makeResult(IVAN));

    await useAuthStore.getState().hydrate();

    // Миграция при hydrate: токен переехал в SecureStore,
    // AsyncStorage очищен.
    await expect(
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    ).resolves.toBeNull();
    expect(
      (SecureStore as unknown as { __store: Map<string, string> }).__store.get(
        REFRESH_TOKEN_KEY,
      ),
    ).toBe('refresh-u1');

    expect(useAuthStore.getState().state).toBe('authenticated');
    expect(useAuthStore.getState().user?.id).toBe('u1');

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
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-u1');
    tryRefreshSpy.mockResolvedValue(true);
    jest.mocked(authApi.getSession).mockResolvedValue(makeResult(IVAN));

    await useAuthStore.getState().hydrate();
    expect(useContextStore.getState().active).toEqual({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o3',
      locationId: 'l4',
    });
  });

  it('hydrate с отозванным refresh → unauthenticated, токен удалён', async () => {
    setClientWindow();
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, 'revoked-refresh');
    tryRefreshSpy.mockResolvedValue(false);

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().state).toBe('unauthenticated');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('hydrate на SSR → unauthenticated сразу, без хранилища', async () => {
    deleteClientWindow();
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().state).toBe('unauthenticated');
    // Ни хранилище, ни API не трогались.
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(authApi.getSession).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------

  it('login: успех → state/user/token, контекст по приоритету членств', async () => {
    setClientWindow();
    jest.mocked(authApi.login).mockResolvedValue(makeResult(IVAN));

    const ok = await useAuthStore.getState().login({
      phone: '+79001234567',
      password: 'qwerty123',
    });

    expect(ok).toBe(true);
    const { state, user, token, error } = useAuthStore.getState();
    expect(state).toBe('authenticated');
    expect(user?.id).toBe('u1');
    expect(token).toBe('access-u1');
    expect(error).toBeNull();
    expect(useContextStore.getState().active).toEqual({
      userId: 'u1',
      role: 'wholesale_seller',
      organizationId: 'o1',
      locationId: null,
    });
    // Refresh сохраняется клиентом authApi (покрыто его тестами);
    // здесь проверяем access-токен в памяти стора.
    expect(useAuthStore.getState().token).toBe('access-u1');
  });

  it('login: ошибка пишется в error, исключение наружу не летит', async () => {
    setClientWindow();
    jest
      .mocked(authApi.login)
      .mockRejectedValue(
        new AuthError('AUTH_INVALID_CREDENTIALS', 'Неверный номер или пароль'),
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

  it('login: сеть недоступна → NETWORK_ERROR с русским текстом', async () => {
    setClientWindow();
    jest
      .mocked(authApi.login)
      .mockRejectedValue(
        new AuthError('NETWORK_ERROR', 'Сервер временно недоступен'),
      );

    const ok = await useAuthStore.getState().login({
      phone: '+79001234567',
      password: 'qwerty123',
    });
    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe(
      'Сервер временно недоступен. Проверьте связь',
    );
  });

  // ---------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------

  it('register: успех → пользователь без членств, контекст customer', async () => {
    setClientWindow();
    jest.mocked(authApi.register).mockResolvedValue(makeResult(NEWBIE));

    const ok = await useAuthStore.getState().register({
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
      .mocked(authApi.register)
      .mockRejectedValue(new AuthError('AUTH_USER_EXISTS', 'Занят'));

    const ok = await useAuthStore.getState().register({
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
    jest.mocked(authApi.loginWithOtp).mockResolvedValue(makeResult(NEWBIE));

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
      .mocked(authApi.loginWithOtp)
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

  it('sendOtp и requestPasswordReset проксируют API с нужным назначением', async () => {
    setClientWindow();
    jest
      .mocked(authApi.sendOtp)
      .mockResolvedValue({ sent: true, devCode: '424242' });

    expect(await useAuthStore.getState().sendOtp('+79001234567')).toBe(true);
    expect(authApi.sendOtp).toHaveBeenCalledWith('+79001234567', 'login');
    // DEV-код сохраняется для подсказки на экране OTP.
    expect(useAuthStore.getState().lastDevCode).toBe('424242');

    expect(
      await useAuthStore.getState().requestPasswordReset('+79001234567'),
    ).toBe(true);
    expect(authApi.sendOtp).toHaveBeenCalledWith(
      '+79001234567',
      'password_reset',
    );
  });

  it('resetPassword: успех → true; провал → ошибка', async () => {
    setClientWindow();
    jest.mocked(authApi.resetPassword).mockResolvedValue(makeResult(IVAN));
    expect(
      await useAuthStore
        .getState()
        .resetPassword('+79001234567', '123456', 'new-pass-1'),
    ).toBe(true);

    jest
      .mocked(authApi.resetPassword)
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
  // refreshUser
  // ---------------------------------------------------------------------

  it('refreshUser обновляет члена и контекст после онбординга', async () => {
    setClientWindow();
    useAuthStore.setState({
      state: 'authenticated',
      user: NEWBIE,
      token: 'access-u2',
      error: null,
    });
    // После онбординга у пользователя появилось членство.
    const grown: AuthUser = {
      ...NEWBIE,
      memberships: [
        {
          userId: 'u2',
          organizationId: 'ob-org-1',
          role: 'store_owner',
          title: 'Владелец',
        },
      ],
    };
    jest.mocked(authApi.getSession).mockResolvedValue(makeResult(grown));

    await useAuthStore.getState().refreshUser();

    expect(useAuthStore.getState().user?.memberships).toHaveLength(1);
    expect(useContextStore.getState().active.role).toBe('store_owner');
  });

  // ---------------------------------------------------------------------
  // logout
  // ---------------------------------------------------------------------

  it('logout: чистит оба стора, отзыв сессии на сервере', async () => {
    setClientWindow();
    // Вход Ивана
    jest.mocked(authApi.login).mockResolvedValue(makeResult(IVAN));
    await useAuthStore
      .getState()
      .login({ phone: '+79001234567', password: 'qwerty123' });

    // Пользователь переключил контекст
    useContextStore.getState().setRole('store_owner');

    await useAuthStore.getState().logout();

    // authStore чист
    const { state, user, token, error } = useAuthStore.getState();
    expect(state).toBe('unauthenticated');
    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(error).toBeNull();

    // Сессия отозвана на сервере, токены клиента очищены.
    expect(authApi.logout).toHaveBeenCalled();
    expect(client.getAccessToken()).toBeNull();

    // Refresh-токен удалён из хранилища.
    await expect(AsyncStorage.getItem(REFRESH_TOKEN_KEY)).resolves.toBeNull();

    // contextStore сброшен на customer без пользователя
    const ctx = useContextStore.getState();
    expect(ctx.active).toEqual({
      userId: '',
      role: 'customer',
      organizationId: null,
      locationId: null,
    });
  });
});
