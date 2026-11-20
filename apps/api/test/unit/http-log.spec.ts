/**
 * Тесты http-log (Промт 18, Часть A): извлечение userId из JWT
 * без верификации (только для логов).
 */
import { userIdFromAuthHeader } from '../../src/common/http-log';

/** Собрать JWT-подобную строку с заданным payload. */
function fakeJwt(payload: unknown): string {
  const b64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.${b64({ sig: 1 })}`;
}

describe('userIdFromAuthHeader', () => {
  it('достаёт sub из валидного Bearer JWT', () => {
    const token = fakeJwt({ sub: 'user-42', role: 'BUYER' });
    expect(userIdFromAuthHeader({ authorization: `Bearer ${token}` })).toBe(
      'user-42',
    );
  });

  it('нет заголовка или не Bearer → null', () => {
    expect(userIdFromAuthHeader(undefined)).toBeNull();
    expect(userIdFromAuthHeader({})).toBeNull();
    expect(
      userIdFromAuthHeader({ authorization: 'Basic dXNlcjpwYXNz' }),
    ).toBeNull();
  });

  it('битый payload → null, не падает', () => {
    expect(
      userIdFromAuthHeader({ authorization: 'Bearer not.a.jwt!' }),
    ).toBeNull();
    expect(userIdFromAuthHeader({ authorization: 'Bearer a.b.c' })).toBeNull();
  });

  it('sub не строка или подозрительно длинный → null', () => {
    expect(
      userIdFromAuthHeader({
        authorization: `Bearer ${fakeJwt({ sub: 123 })}`,
      }),
    ).toBeNull();
    expect(
      userIdFromAuthHeader({
        authorization: `Bearer ${fakeJwt({ sub: 'x'.repeat(100) })}`,
      }),
    ).toBeNull();
  });
});
