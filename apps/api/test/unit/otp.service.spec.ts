/**
 * Unit-тесты OtpService: выдача, проверка, ошибки, попытки.
 */
import { OtpService } from '../../src/auth/otp.service';

describe('OtpService (unit)', () => {
  let service: OtpService;

  beforeEach(() => {
    service = new OtpService();
  });

  it('выдаёт 6-значный код и принимает его', () => {
    const code = service.issue('+79001112233', 'login');
    expect(code).toMatch(/^\d{6}$/);
    expect(() => service.verify('+79001112233', 'login', code)).not.toThrow();
  });

  it('код одноразовый: повторная проверка падает', () => {
    const code = service.issue('+79001112233', 'login');
    service.verify('+79001112233', 'login', code);
    expect(() => service.verify('+79001112233', 'login', code)).toThrowError(
      expect.objectContaining({ code: 'AUTH_OTP_INVALID' }),
    );
  });

  it('неверный код — AUTH_OTP_INVALID', () => {
    service.issue('+79001112233', 'login');
    expect(() =>
      service.verify('+79001112233', 'login', '000000'),
    ).toThrowError(expect.objectContaining({ code: 'AUTH_OTP_INVALID' }));
  });

  it('просроченный код — AUTH_OTP_EXPIRED', () => {
    jest.useFakeTimers();
    const code = service.issue('+79001112233', 'login');
    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(() => service.verify('+79001112233', 'login', code)).toThrowError(
      expect.objectContaining({ code: 'AUTH_OTP_EXPIRED' }),
    );
    jest.useRealTimers();
  });

  it('после 5 неверных попыток код сгорает', () => {
    const code = service.issue('+79001112233', 'login');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(() => service.verify('+79001112233', 'login', '000000')).toThrow();
    }
    // Код удалён после 5 неудач — верный уже не примут.
    expect(() => service.verify('+79001112233', 'login', code)).toThrowError(
      expect.objectContaining({ code: 'AUTH_OTP_INVALID' }),
    );
  });

  it('назначения изолированы: код сброса не подходит для входа', () => {
    const resetCode = service.issue('+79001112233', 'password_reset');
    expect(() =>
      service.verify('+79001112233', 'login', resetCode),
    ).toThrowError(expect.objectContaining({ code: 'AUTH_OTP_INVALID' }));
  });

  it('новый код заменяет старый', () => {
    service.issue('+79001112233', 'login');
    const fresh = service.issue('+79001112233', 'login');
    expect(() => service.verify('+79001112233', 'login', fresh)).not.toThrow();
  });
});
