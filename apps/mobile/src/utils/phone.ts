/**
 * Форматирование телефона и кодов для экранов аутентификации.
 *
 * Маска телефона: +7 (999) 999-99-99. Ввод прощает ведущую 8
 * (заменяем на 7) и лишние символы. Маска кода: 999-999.
 */

/** Только цифры из произвольного ввода. */
export function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

/** Приводит ввод к 11 цифрам, начинающимся с 7. */
function normalizeDigits(raw: string): string {
  let d = digitsOf(raw).slice(0, 11);
  if (!d) {
    return '';
  }
  if (d[0] === '8') {
    d = `7${d.slice(1)}`;
  } else if (d[0] !== '7') {
    d = `7${d.slice(0, 10)}`;
  }
  return d;
}

/** Форматирует ввод в маску +7 (999) 999-99-99. */
export function formatPhoneInput(raw: string): string {
  const d = normalizeDigits(raw);
  if (!d) {
    return '';
  }
  const rest = d.slice(1);
  let out = '+7';
  if (rest.length > 0) {
    out += ` (${rest.slice(0, 3)}`;
  }
  if (rest.length >= 4) {
    out += `) ${rest.slice(3, 6)}`;
  }
  if (rest.length >= 7) {
    out += `-${rest.slice(6, 8)}`;
  }
  if (rest.length >= 9) {
    out += `-${rest.slice(8, 10)}`;
  }
  return out;
}

/** E.164 (+7 и 10 цифр) из произвольного ввода; null если цифр мало. */
export function phoneToE164(raw: string): string | null {
  const d = normalizeDigits(raw);
  if (d.length !== 11 || d[0] !== '7') {
    return null;
  }
  return `+${d}`;
}

/** Маска кода: 999-999. */
export function formatOtpInput(raw: string): string {
  const d = digitsOf(raw).slice(0, 6);
  if (d.length <= 3) {
    return d;
  }
  return `${d.slice(0, 3)}-${d.slice(3)}`;
}
