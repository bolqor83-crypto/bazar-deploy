/**
 * Тесты сценария сброса пароля: запрос кода и подтверждение.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AuthError } from '@bazar/types';
import { authApi } from '../services/api/authApi';
import { __resetAuthStoreForTests } from '../stores/authStore';
import ResetRequestScreen from '../app/(auth)/reset-request';
import ResetConfirmScreen from '../app/(auth)/reset-confirm';

jest.mock('../services/api/authApi');

describe('(auth)/reset-request', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    jest.clearAllMocks();
    jest.mocked(router.push).mockClear();
  });

  it('рендерит телефон и кнопку отправки', async () => {
    const screen = await render(<ResetRequestScreen />);
    expect(screen.getByText('Сброс пароля')).toBeTruthy();
    expect(screen.getByLabelText('Телефон')).toBeTruthy();
    expect(screen.getByText('Отправить код')).toBeTruthy();
  });

  it('невалидный телефон → ошибка', async () => {
    const screen = await render(<ResetRequestScreen />);
    await fireEvent.press(screen.getByText('Отправить код'));
    expect(
      screen.getByText('Введите номер полностью: +7 (999) 999-99-99'),
    ).toBeTruthy();
    expect(authApi.sendOtp).not.toHaveBeenCalled();
  });

  it('успех → переход на /reset-confirm с телефоном', async () => {
    jest
      .mocked(authApi.sendOtp)
      .mockResolvedValue({ sent: true, devCode: null });
    const screen = await render(<ResetRequestScreen />);

    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.press(screen.getByText('Отправить код'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/reset-confirm',
        params: { phone: '+79001234567' },
      });
    });
  });
});

describe('(auth)/reset-confirm', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    jest.clearAllMocks();
    jest.mocked(router.replace).mockClear();
  });

  it('рендерит код, пароли и кнопку сохранения', async () => {
    const screen = await render(<ResetConfirmScreen />);
    expect(screen.getByLabelText('Телефон')).toBeTruthy();
    expect(screen.getByLabelText('Код из SMS')).toBeTruthy();
    expect(screen.getByLabelText('Новый пароль')).toBeTruthy();
    expect(screen.getByLabelText('Повторите пароль')).toBeTruthy();
    expect(screen.getByText('Сохранить пароль')).toBeTruthy();
  });

  it('пустые поля → ошибки валидации', async () => {
    const screen = await render(<ResetConfirmScreen />);
    await fireEvent.press(screen.getByText('Сохранить пароль'));
    expect(screen.getByText('Введите номер полностью')).toBeTruthy();
    expect(screen.getByText('Введите 6 цифр кода')).toBeTruthy();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it('успех → диалог и возврат на /login', async () => {
    jest.mocked(authApi.resetPassword).mockResolvedValue({
      user: {
        id: 'u1',
        phone: '+79001234567',
        name: 'Иван Петров',
        createdAt: '2026-01-01T00:00:00.000Z',
        memberships: [],
      },
      accessToken: 'access-u1',
      refreshToken: 'refresh-u1',
      world: { memberships: [], organizations: [], locations: [] },
    });
    const screen = await render(<ResetConfirmScreen />);

    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.changeText(screen.getByLabelText('Код из SMS'), '123456');
    await fireEvent.changeText(
      screen.getByLabelText('Новый пароль'),
      'newpass1',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Повторите пароль'),
      'newpass1',
    );
    await fireEvent.press(screen.getByText('Сохранить пароль'));

    // Диалог подтверждения
    await waitFor(() => {
      expect(screen.getByText('Пароль изменён')).toBeTruthy();
    });
    expect(authApi.resetPassword).toHaveBeenCalledWith(
      '+79001234567',
      '123456',
      'newpass1',
    );

    await fireEvent.press(screen.getByText('Войти'));
    expect(router.replace).toHaveBeenCalledWith('/login');
  });

  it('истёкший код → ошибка из store', async () => {
    jest
      .mocked(authApi.resetPassword)
      .mockRejectedValue(new AuthError('AUTH_OTP_EXPIRED', 'Истёк'));
    const screen = await render(<ResetConfirmScreen />);

    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.changeText(screen.getByLabelText('Код из SMS'), '123456');
    await fireEvent.changeText(
      screen.getByLabelText('Новый пароль'),
      'newpass1',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Повторите пароль'),
      'newpass1',
    );
    await fireEvent.press(screen.getByText('Сохранить пароль'));

    await waitFor(() => {
      expect(screen.getByText('Код истёк. Запросите новый')).toBeTruthy();
    });
  });
});
