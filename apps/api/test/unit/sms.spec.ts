/**
 * Unit-тесты SMS-модуля (Промт 10, Часть A): провайдеры и
 * rate limiter отправки OTP.
 */
import { OtpSendRateLimiter } from '../../src/sms/otp-send-rate-limiter.service';
import { ConsoleSmsProvider } from '../../src/sms/console-sms.provider';
import { TwilioSmsProvider } from '../../src/sms/twilio-sms.provider';
import { NotImplementedSmsProvider } from '../../src/sms/not-implemented-sms.provider';
import { AppLogger } from '../../src/common/app-logger';

describe('ConsoleSmsProvider', () => {
  it('не бросает и представляется как console', async () => {
    const provider = new ConsoleSmsProvider(new AppLogger());
    await expect(
      provider.send('+79001112233', 'Bazar: код 123456'),
    ).resolves.toBeUndefined();
    expect(provider.name).toBe('console');
  });
});

describe('NotImplementedSmsProvider', () => {
  it('бросает 503 SMS_NOT_CONFIGURED', async () => {
    const provider = new NotImplementedSmsProvider();
    await expect(provider.send('+79001112233', 'x')).rejects.toMatchObject({
      response: { code: 'SMS_NOT_CONFIGURED' },
    });
    expect(provider.name).toBe('none');
  });
});

describe('TwilioSmsProvider', () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
  });

  it('без кредов — 503 SMS_NOT_CONFIGURED', async () => {
    const provider = new TwilioSmsProvider();
    await expect(provider.send('+79001112233', 'x')).rejects.toMatchObject({
      response: { code: 'SMS_NOT_CONFIGURED' },
    });
  });

  it('успешная отправка — POST на Messages.json с Basic-auth', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_AUTH_TOKEN = 'tok';
    process.env.TWILIO_FROM_NUMBER = '+15000000000';
    const { __resetEnvCacheForTests } = await import(
      '../../src/config/env'
    );
    __resetEnvCacheForTests();
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new TwilioSmsProvider();
    await provider.send('+79001112233', 'Bazar: код 123456');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('ACtest/Messages.json');
    expect((init.headers as Record<string, string>).Authorization).toContain(
      'Basic ',
    );
    expect(String(init.body)).toContain('To=%2B79001112233');
    expect(provider.name).toBe('twilio');
    __resetEnvCacheForTests();
  });

  it('отказ провайдера — 502 SMS_SEND_FAILED', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_AUTH_TOKEN = 'tok';
    process.env.TWILIO_FROM_NUMBER = '+15000000000';
    const { __resetEnvCacheForTests } = await import(
      '../../src/config/env'
    );
    __resetEnvCacheForTests();
    globalThis.fetch = (jest
      .fn()
      .mockResolvedValue({ ok: false }) as unknown) as typeof fetch;

    const provider = new TwilioSmsProvider();
    await expect(provider.send('+79001112233', 'x')).rejects.toMatchObject({
      response: { code: 'SMS_SEND_FAILED' },
    });
    __resetEnvCacheForTests();
  });
});

describe('OtpSendRateLimiter', () => {
  let limiter: OtpSendRateLimiter;

  beforeEach(() => {
    limiter = new OtpSendRateLimiter();
  });

  it('3 отправки за 10 минут — ок, 4-я — 429', () => {
    const t0 = 1_000_000;
    expect(() => limiter.checkAndCount('+79001112233', t0)).not.toThrow();
    expect(() =>
      limiter.checkAndCount('+79001112233', t0 + 60_000),
    ).not.toThrow();
    expect(() =>
      limiter.checkAndCount('+79001112233', t0 + 120_000),
    ).not.toThrow();
    expect(() => limiter.checkAndCount('+79001112233', t0 + 180_000)).toThrow(
      expect.objectContaining({
        code: 'AUTH_RATE_LIMIT',
      }),
    );
  });

  it('окно скользящее: старые отправки за 10 минут не считаются', () => {
    const t0 = 1_000_000;
    limiter.checkAndCount('+79001112233', t0);
    limiter.checkAndCount('+79001112233', t0 + 60_000);
    limiter.checkAndCount('+79001112233', t0 + 120_000);
    // Первая отправка выпала из окна.
    expect(() =>
      limiter.checkAndCount('+79001112233', t0 + 10 * 60_000 + 1),
    ).not.toThrow();
  });

  it('лимиты независимы по номерам', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i += 1) {
      limiter.checkAndCount('+79001112233', t0 + i);
    }
    expect(() => limiter.checkAndCount('+79005556677', t0)).not.toThrow();
  });
});
