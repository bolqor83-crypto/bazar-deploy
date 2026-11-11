/**
 * Тесты экрана входа по OTP: два шага, таймер повторной отправки,
 * успешный вход, DEV-код из ответа API (Промт 7).
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { AuthUser } from '@bazar/types';
import { AuthError } from '@bazar/types';
import { authApi, type AuthResult } from '../services/api/authApi';
import { __resetAuthStoreForTests, useAuthStore } from '../stores/authStore';
import OtpScreen from '../app/(auth)/otp';

jest.mock('../services/api/authApi');

const IVAN: AuthUser = {
  id: 'u1',
  phone: '+79001234567',
  name: 'Иван Петров',
  createdAt: '2026-01-01T00:00:00.000Z',
  memberships: [],
};

function authResult(user: AuthUser): AuthResult {
  return {
    user,
    accessToken: 'access-u1',
    refreshToken: 'refresh-u1',
    world: { memberships: user.memberships, organizations: [], locations: [] },
  };
}

describe('(auth)/otp', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    jest.clearAllMocks();
    jest.mocked(router.replace).mockClear();
  });

  it('шаг 1: телефон и кнопка «Отправить код»', async () => {
    const screen = await render(<OtpScreen />);
    expect(screen.getByText('Вход по коду')).toBeTruthy();
    expect(screen.getByLabelText('Телефон')).toBeTruthy();
    expect(screen.getByText('Отправить код')).toBeTruthy();
    expect(screen.queryByLabelText('Код из SMS')).toBeNull();
  });

  it('невалидный телефон → ошибка, шаг не меняется', async () => {
    const screen = await render(<OtpScreen />);
    await fireEvent.changeText(screen.getByLabelText('Телефон'), '7900');
    await fireEvent.press(screen.getByText('Отправить код'));
    expect(
      screen.getByText('Введите номер полностью: +7 (999) 999-99-99'),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Код из SMS')).toBeNull();
    expect(authApi.sendOtp).not.toHaveBeenCalled();
  });

  it('отправка кода → шаг 2 с таймером повторной отправки', async () => {
    jest
      .mocked(authApi.sendOtp)
      .mockResolvedValue({ sent: true, devCode: null });
    const screen = await render(<OtpScreen />);

    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.press(screen.getByText('Отправить код'));

    expect(screen.getByLabelText('Код из SMS')).toBeTruthy();
    expect(screen.getByText('Отправить повторно через 60 с')).toBeTruthy();
    // Повторная отправка недоступна, пока тикает таймер
    expect(screen.queryByText('Отправить код повторно')).toBeNull();
    expect(authApi.sendOtp).toHaveBeenCalledWith('+79001234567', 'login');
  });

  it('маска кода 999-999', async () => {
    jest
      .mocked(authApi.sendOtp)
      .mockResolvedValue({ sent: true, devCode: null });
    const screen = await render(<OtpScreen />);
    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.press(screen.getByText('Отправить код'));

    await fireEvent.changeText(screen.getByLabelText('Код из SMS'), '123456');
    expect(screen.getByLabelText('Код из SMS').props.value).toBe('123-456');
  });

  it('неполный код → ошибка', async () => {
    jest
      .mocked(authApi.sendOtp)
      .mockResolvedValue({ sent: true, devCode: null });
    const screen = await render(<OtpScreen />);
    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.press(screen.getByText('Отправить код'));

    await fireEvent.changeText(screen.getByLabelText('Код из SMS'), '123');
    await fireEvent.press(screen.getByText('Войти'));
    expect(screen.getByText('Введите 6 цифр кода')).toBeTruthy();
    expect(authApi.loginWithOtp).not.toHaveBeenCalled();
  });

  it('успешный вход по коду → сессия в store, экран не навигирует сам', async () => {
    jest
      .mocked(authApi.sendOtp)
      .mockResolvedValue({ sent: true, devCode: null });
    jest.mocked(authApi.loginWithOtp).mockResolvedValue(authResult(IVAN));
    const screen = await render(<OtpScreen />);

    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.press(screen.getByText('Отправить код'));
    await fireEvent.changeText(screen.getByLabelText('Код из SMS'), '123456');
    await fireEvent.press(screen.getByText('Войти'));

    await waitFor(() => {
      expect(useAuthStore.getState().state).toBe('authenticated');
    });
    // Баг №2: навигацию выполняет только AuthGuard — без собственного
    // router.replace экрана (иначе гонка с Redirect guard'а).
    expect(router.replace).not.toHaveBeenCalled();
    expect(authApi.loginWithOtp).toHaveBeenCalledWith('+79001234567', '123456');
  });

  it('неверный код → ошибка из store', async () => {
    jest
      .mocked(authApi.sendOtp)
      .mockResolvedValue({ sent: true, devCode: null });
    jest
      .mocked(authApi.loginWithOtp)
      .mockRejectedValue(new AuthError('AUTH_OTP_INVALID', 'Неверный код'));
    const screen = await render(<OtpScreen />);

    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.press(screen.getByText('Отправить код'));
    await fireEvent.changeText(screen.getByLabelText('Код из SMS'), '000000');
    await fireEvent.press(screen.getByText('Войти'));

    await waitFor(() => {
      expect(
        screen.getByText('Неверный код. Проверьте и попробуйте ещё раз'),
      ).toBeTruthy();
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('DEV: код из ответа API показывается на шаге ввода', async () => {
    expect(__DEV__).toBe(true);
    jest
      .mocked(authApi.sendOtp)
      .mockResolvedValue({ sent: true, devCode: '424242' });
    const screen = await render(<OtpScreen />);

    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.press(screen.getByText('Отправить код'));

    await waitFor(() => {
      expect(screen.getByText('DEV: код для входа — 424242')).toBeTruthy();
    });
  });
});
