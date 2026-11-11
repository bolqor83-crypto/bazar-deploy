/**
 * DTO аутентификации. Валидация class-validator, тексты на русском.
 */
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/** E.164: + и 11–15 цифр, например +79001234567. */
export const PHONE_PATTERN = /^\+[1-9]\d{10,14}$/;

/** Пароль: минимум 8 символов, хотя бы одна буква и одна цифра. */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-zА-Яа-яЁё])(?=.*\d).{8,}$/;

export class RegisterDto {
  @Matches(PHONE_PATTERN, {
    message: 'Телефон должен быть в формате E.164, например +79001234567',
  })
  phone!: string;

  @Matches(PASSWORD_PATTERN, {
    message: 'Пароль: минимум 8 символов, хотя бы одна буква и одна цифра',
  })
  password!: string;

  @MinLength(2, { message: 'Имя: минимум 2 символа' })
  @IsString()
  name!: string;
}

export class LoginDto {
  @Matches(PHONE_PATTERN, {
    message: 'Телефон должен быть в формате E.164, например +79001234567',
  })
  phone!: string;

  @IsString()
  @MinLength(1, { message: 'Введите пароль' })
  password!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(20, { message: 'Невалидный refresh-токен' })
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  @MinLength(20, { message: 'Невалидный refresh-токен' })
  refreshToken!: string;
}

export class SendOtpDto {
  @Matches(PHONE_PATTERN, {
    message: 'Телефон должен быть в формате E.164, например +79001234567',
  })
  phone!: string;

  /** Назначение кода: вход или сброс пароля. По умолчанию вход. */
  @IsOptional()
  @IsIn(['login', 'password_reset'], {
    message: 'Назначение кода: login или password_reset',
  })
  purpose?: 'login' | 'password_reset';
}

export class VerifyOtpDto {
  @Matches(PHONE_PATTERN, {
    message: 'Телефон должен быть в формате E.164, например +79001234567',
  })
  phone!: string;

  @Matches(/^\d{6}$/, { message: 'Код — 6 цифр' })
  code!: string;
}

export class PasswordResetDto {
  @Matches(PHONE_PATTERN, {
    message: 'Телефон должен быть в формате E.164, например +79001234567',
  })
  phone!: string;

  @Matches(/^\d{6}$/, { message: 'Код — 6 цифр' })
  code!: string;

  @Matches(PASSWORD_PATTERN, {
    message: 'Пароль: минимум 8 символов, хотя бы одна буква и одна цифра',
  })
  newPassword!: string;
}
