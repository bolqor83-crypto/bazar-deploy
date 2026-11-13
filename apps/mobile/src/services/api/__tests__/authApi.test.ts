/**
 * Тесты authApi: маппинг контракта API в типы @bazar/types,
 * сохранение токенов (access — память, refresh — SecureStore,
 * Промт 10).
 *
 * Мок клиентского модуля: вызовы проверяются на уровне контракта.
 */
import * as SecureStore from 'expo-secure-store';
import * as client from '../client';
import { authApi } from '../authApi';

const secure = SecureStore as unknown as { __store: Map<string, string> };

jest.mock('../client', () => {
  const actual = jest.requireActual('../client');
  return {
    ...actual,
    apiRequest: jest.fn(),
  };
});

const apiRequestMock = jest.mocked(client.apiRequest);

/** Ответ /auth/login в терминах API. */
const API_RESPONSE = {
  user: {
    id: 'u1',
    phone: '+79001234567',
    name: 'Иван Петров',
    createdAt: '2026-01-01T00:00:00.000Z',
    memberships: [
      {
        userId: 'u1',
        organizationId: 'o1',
        role: 'WHOLESALE_SELLER',
        title: 'Менеджер оптовых продаж',
        organization: {
          id: 'o1',
          name: 'Опт-Юг',
          shortName: 'Опт-Юг',
          kind: 'wholesale',
        },
        locations: [
          {
            id: 'l1',
            organizationId: 'o1',
            name: 'Склад на Юге',
            shortName: 'Склад на Юге',
            address: 'ул. Южная, 1',
            city: 'Ростов-на-Дону',
          },
        ],
      },
      {
        userId: 'u1',
        organizationId: 'o2',
        role: 'STORE_OWNER',
        title: 'Владелец',
        organization: {
          id: 'o2',
          name: 'Сеть «У дома»',
          shortName: 'У дома',
          kind: 'retail',
        },
        locations: [],
      },
    ],
  },
  accessToken: 'access-u1',
  refreshToken: 'refresh-u1',
};

describe('authApi', () => {
  beforeEach(async () => {
    secure.__store.clear();
    client.setAccessToken(null);
    apiRequestMock.mockReset();
  });

  it('login: маппит роли/типы в нижний регистр и собирает мир', async () => {
    apiRequestMock.mockResolvedValueOnce(API_RESPONSE);

    const result = await authApi.login({
      phone: '+79001234567',
      password: 'qwerty123',
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { phone: '+79001234567', password: 'qwerty123' },
      auth: false,
    });

    expect(result.user.name).toBe('Иван Петров');
    expect(result.user.memberships[0]?.role).toBe('wholesale_seller');
    expect(result.user.memberships[1]?.role).toBe('store_owner');
    // Снимок мира: организации и точки развёрнуты в плоские списки.
    expect(result.world.organizations).toHaveLength(2);
    expect(result.world.organizations[1]?.shortName).toBe('У дома');
    expect(result.world.organizations[1]?.kind).toBe('retail');
    expect(result.world.locations).toHaveLength(1);
    // city не входит в мобильный тип BusinessLocation — маппер отбрасывает.
    const serialized = JSON.stringify(result.world.locations[0]);
    expect(serialized).not.toContain('Ростов-на-Дону');
    expect(result.world.memberships).toHaveLength(2);

    // Токены: access в памяти, refresh в хранилище.
    expect(client.getAccessToken()).toBe('access-u1');
    expect(secure.__store.get('bazar.auth.refresh')).toBe('refresh-u1');
  });

  it('register и loginWithOtp используют свои эндпоинты', async () => {
    apiRequestMock.mockResolvedValue(API_RESPONSE);

    await authApi.register({
      phone: '+79001112233',
      password: 'password1',
      name: 'Мария',
    });
    expect(apiRequestMock).toHaveBeenLastCalledWith('/auth/register', {
      method: 'POST',
      body: { phone: '+79001112233', password: 'password1', name: 'Мария' },
      auth: false,
    });

    await authApi.loginWithOtp('+79001112233', '123456');
    expect(apiRequestMock).toHaveBeenLastCalledWith('/auth/otp/verify', {
      method: 'POST',
      body: { phone: '+79001112233', code: '123456' },
      auth: false,
    });
  });

  it('sendOtp: назначение входа по умолчанию, devCode передаётся', async () => {
    apiRequestMock
      .mockResolvedValueOnce({ sent: true, devCode: '424242' })
      .mockResolvedValueOnce({ sent: true, devCode: null });

    const result = await authApi.sendOtp('+79001234567');
    expect(result).toEqual({ sent: true, devCode: '424242' });
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/otp/send', {
      method: 'POST',
      body: { phone: '+79001234567', purpose: 'login' },
      auth: false,
    });

    await authApi.sendOtp('+79001234567', 'password_reset');
    expect(apiRequestMock).toHaveBeenLastCalledWith('/auth/otp/send', {
      method: 'POST',
      body: { phone: '+79001234567', purpose: 'password_reset' },
      auth: false,
    });
  });

  it('resetPassword вызывает эндпоинт сброса', async () => {
    apiRequestMock.mockResolvedValueOnce(API_RESPONSE);
    await authApi.resetPassword('+79001234567', '123456', 'newpass456');
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/password/reset', {
      method: 'POST',
      body: {
        phone: '+79001234567',
        code: '123456',
        newPassword: 'newpass456',
      },
      auth: false,
    });
  });

  it('getSession: /auth/me с авторизацией, мир из ответа', async () => {
    apiRequestMock.mockResolvedValueOnce(API_RESPONSE.user);
    const result = await authApi.getSession();

    expect(apiRequestMock).toHaveBeenCalledWith('/auth/me');
    expect(result.user.id).toBe('u1');
    expect(result.world.organizations).toHaveLength(2);
  });

  it('logout: отзыв refresh-сессии; без токена — без запроса', async () => {
    await client.setRefreshToken('refresh-u1');
    apiRequestMock.mockResolvedValueOnce({});

    await authApi.logout();
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
      body: { refreshToken: 'refresh-u1' },
      auth: false,
    });

    // Без refresh-токена logout не ходит в сеть.
    await client.setRefreshToken(null);
    apiRequestMock.mockClear();
    await authApi.logout();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});
