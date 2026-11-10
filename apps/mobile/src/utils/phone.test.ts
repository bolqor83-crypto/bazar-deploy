/**
 * Тесты форматирования телефона и кода.
 */
import { formatOtpInput, formatPhoneInput, phoneToE164 } from './phone';

describe('formatPhoneInput', () => {
  it('пустой ввод → пустая строка', () => {
    expect(formatPhoneInput('')).toBe('');
  });

  it('цифры собираются в маску', () => {
    expect(formatPhoneInput('7')).toBe('+7');
    expect(formatPhoneInput('79')).toBe('+7 (9');
    expect(formatPhoneInput('7900')).toBe('+7 (900');
    expect(formatPhoneInput('79001234567')).toBe('+7 (900) 123-45-67');
  });

  it('маскированный ввод переформатируется', () => {
    expect(formatPhoneInput('+7 (900) 123-45-67')).toBe('+7 (900) 123-45-67');
  });

  it('ведущая 8 заменяется на 7', () => {
    expect(formatPhoneInput('89001234567')).toBe('+7 (900) 123-45-67');
  });

  it('лишние символы отбрасываются', () => {
    expect(formatPhoneInput('+7 (900) 123-45-67 доб. 8')).toBe(
      '+7 (900) 123-45-67',
    );
  });
});

describe('phoneToE164', () => {
  it('полный номер → E.164', () => {
    expect(phoneToE164('+7 (900) 123-45-67')).toBe('+79001234567');
  });

  it('неполный номер → null', () => {
    expect(phoneToE164('+7 (900) 123')).toBeNull();
  });

  it('не начинается с 7 → null', () => {
    expect(phoneToE164('8900123456')).toBeNull(); // 10 цифр
  });
});

describe('formatOtpInput', () => {
  it('до 3 цифр — как есть', () => {
    expect(formatOtpInput('12')).toBe('12');
    expect(formatOtpInput('123')).toBe('123');
  });

  it('6 цифр → 999-999', () => {
    expect(formatOtpInput('123456')).toBe('123-456');
    expect(formatOtpInput('123-456')).toBe('123-456');
  });

  it('больше 6 цифр обрезается', () => {
    expect(formatOtpInput('1234567')).toBe('123-456');
  });
});
