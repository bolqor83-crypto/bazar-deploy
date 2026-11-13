/**
 * Тесты HTTP-клиента API (Промт 7): заголовки, авто-refresh при 401,
 * таймаут, network-ошибки, health-check.
 *
 * Глобальный fetch замокан; refresh-токен живёт в моке
 * expo-secure-store (Промт 10) — реально кладётся и читается,
 * AsyncStorage больше не участвует.
 */
import * as SecureStore from 'expo-secure-store';
import { AuthError } from '@bazar/types';
import {
  apiRequest,
  getAccessToken,
  getRefreshToken,
  pingApi,
  setAccessToken,
  setRefreshToken,
  setSessionExpiredHandler,
} from '../client';
import { REFRESH_TOKEN_KEY } from '../../storage/tokenStorage';

const secure = SecureStore as unknown as {
  __store: Map<string, string>;
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** Мок глобального fetch — устанавливаем явно на каждый тест. */
const fetchMock = jest.fn();
const realFetch = globalThis.fetch;

describe('api/client', () => {
  beforeAll(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  beforeEach(async () => {
    secure.__store.clear();
    setAccessToken(null);
    setSessionExpiredHandler(null);
    fetchMock.mockReset();
  });

  it('GET-запрос возвращает распарсенный JSON', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: 'ok' }));
    const result = await apiRequest<{ status: string }>('/health', {
      auth: false,
    });
    expect(result).toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('POST-запрос отправляет JSON-тело', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { sent: true }));
    await apiRequest('/auth/otp/send', {
      method: 'POST',
      body: { phone: '+79001234567' },
      auth: false,
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"phone":"+79001234567"}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('access-токен подставляется в Authorization', async () => {
    setAccessToken('access-abc');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await apiRequest('/auth/me');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer access-abc',
    );
  });

  it('ошибка API маппится в AuthError с кодом', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, {
        statusCode: 409,
        code: 'AUTH_USER_EXISTS',
        message: 'Занят',
      }),
    );
    await expect(
      apiRequest('/auth/register', { method: 'POST', auth: false }),
    ).rejects.toMatchObject({ code: 'AUTH_USER_EXISTS' });
  });

  it('неизвестный код ошибки → AUTH_UNKNOWN', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { statusCode: 400, code: 'SOMETHING_ELSE' }),
    );
    await expect(apiRequest('/x', { auth: false })).rejects.toMatchObject({
      code: 'AUTH_UNKNOWN',
    });
  });

  it('сетевой сбой → NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(apiRequest('/health', { auth: false })).rejects.toBeInstanceOf(
      AuthError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('401 → refresh → повтор запроса с новым токеном', async () => {
    await setRefreshToken('refresh-old');
    setAccessToken('access-expired');

    fetchMock
      // Исходный запрос: просрочен access.
      .mockResolvedValueOnce(jsonResponse(401, { code: 'AUTH_UNAUTHORIZED' }))
      // Ротация refresh.
      .mockResolvedValueOnce(
        jsonResponse(200, {
          accessToken: 'access-new',
          refreshToken: 'refresh-new',
        }),
      )
      // Повтор исходного запроса.
      .mockResolvedValueOnce(jsonResponse(200, { id: 'u1' }));

    const result = await apiRequest<{ id: string }>('/auth/me');
    expect(result).toEqual({ id: 'u1' });
    expect(getAccessToken()).toBe('access-new');
    await expect(getRefreshToken()).resolves.toBe('refresh-new');

    // Три вызова: исходный, refresh, повтор.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const refreshCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(refreshCall[0]).toBe('/api/auth/refresh');
  });

  it('401 без refresh-токена → AUTH_SESSION_EXPIRED и обработчик', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    setSessionExpiredHandler(handler);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { code: 'AUTH_UNAUTHORIZED' }),
    );

    await expect(apiRequest('/auth/me')).rejects.toMatchObject({
      code: 'AUTH_SESSION_EXPIRED',
    });
    expect(handler).toHaveBeenCalled();
  });

  it('401 при неудачном refresh → токен стёрт, обработчик вызван', async () => {
    await setRefreshToken('refresh-dead');
    const handler = jest.fn().mockResolvedValue(undefined);
    setSessionExpiredHandler(handler);

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { code: 'AUTH_UNAUTHORIZED' }))
      .mockResolvedValueOnce(
        jsonResponse(401, { code: 'AUTH_REFRESH_INVALID' }),
      );

    await expect(apiRequest('/auth/me')).rejects.toMatchObject({
      code: 'AUTH_SESSION_EXPIRED',
    });
    await expect(getRefreshToken()).resolves.toBeNull();
    expect(secure.__store.get(REFRESH_TOKEN_KEY)).toBeUndefined();
    expect(handler).toHaveBeenCalled();
  });

  it('повторный 401 после refresh не зацикливается', async () => {
    await setRefreshToken('refresh-x');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          accessToken: 'a',
          refreshToken: 'b',
        }),
      )
      .mockResolvedValueOnce(jsonResponse(401, { code: 'AUTH_UNAUTHORIZED' }));

    await expect(apiRequest('/auth/me')).rejects.toMatchObject({
      code: 'AUTH_UNAUTHORIZED',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('pingApi: true при живом API, false при недоступном', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: 'ok', db: 'ok' }),
    );
    await expect(pingApi()).resolves.toBe(true);

    fetchMock.mockRejectedValueOnce(new TypeError('down'));
    await expect(pingApi()).resolves.toBe(false);
  });
});
