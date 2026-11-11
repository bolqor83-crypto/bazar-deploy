/**
 * Тесты экрана входа по OTP: два шага, таймер повторной отправки,
 * успешный вход.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { AuthUser, Session } from '@bazar/types';
import { AuthError } from '@bazar/types';
import { authMockService } from '../services/authMock';
import { __resetAuthStoreForTests, useAuthStore } from '../stores/authStore';
import OtpScreen from '../app/(auth)/otp';

jest.mock('../services/authMock');

const IVAN: AuthUser = {
  id: 'u1',
  phone: '+79001234567',
  name: 'Иван Петров',
  createdAt: '2026-01-01T00:00:00.000Z',
  memberships: [],
};

const SESSION: Session = {
  userId: 'u1',
  token: 'token-u1',
  issuedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-08T00:00:00.000Z',
};

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
    expect(authMockService.sendOtp).not.toHaveBeenCalled();
  });

  it('отправка кода → шаг 2 с таймером повторной отправки', async () => {
    jest.mocked(authMockService.sendOtp).mockResolvedValue({ sent: true });
    const screen = await render(<OtpScreen />);

    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.press(screen.getByText('Отправить код'));

    expect(screen.getByLabelText('Код из SMS')).toBeTruthy();
    expect(screen.getByText('Отправить повторно через 60 с')).toBeTruthy();
    // Повторная отправка недоступна, пока тикает таймер
    expect(screen.queryByText('Отправить код повторно')).toBeNull();
    expect(authMockService.sendOtp).toHaveBeenCalledWith('+79001234567');
  });

  it('маска кода 999-999', async () => {
    jest.mocked(authMockService.sendOtp).mockResolvedValue({ sent: true });
    const screen = await render(<OtpScreen />);
    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.press(screen.getByText('Отправить код'));

    await fireEvent.changeText(screen.getByLabelText('Код из SMS'), '123456');
    expect(screen.getByLabelText('Код из SMS').props.value).toBe('123-456');
  });

  it('неполный код → ошибка', async () => {
    jest.mocked(authMockService.sendOtp).mockResolvedValue({ sent: true });
    const screen = await render(<OtpScreen />);
    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.press(screen.getByText('Отправить код'));

    await fireEvent.changeText(screen.getByLabelText('Код из SMS'), '123');
    await fireEvent.press(screen.getByText('Войти'));
    expect(screen.getByText('Введите 6 цифр кода')).toBeTruthy();
    expect(authMockService.loginWithOtp).not.toHaveBeenCalled();
  });

  it('успешный вход по коду → сессия в store, экран не навигирует сам', async () => {
    jest.mocked(authMockService.sendOtp).mockResolvedValue({ sent: true });
    jest
      .mocked(authMockService.loginWithOtp)
      .mockResolvedValue({ user: IVAN, session: SESSION });
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
    expect(authMockService.loginWithOtp).toHaveBeenCalledWith(
      '+79001234567',
      '123456',
    );
  });

  it('неверный код → ошибка из store', async () => {
    jest.mocked(authMockService.sendOtp).mockResolvedValue({ sent: true });
    jest
      .mocked(authMockService.loginWithOtp)
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

  it('DEV-подсказка о коде в консоли присутствует в dev-сборке', async () => {
    expect(__DEV__).toBe(true);
    const screen = await render(<OtpScreen />);
    expect(
      screen.getByText('DEV: код показывается в консоли сервера'),
    ).toBeTruthy();
  });
});
