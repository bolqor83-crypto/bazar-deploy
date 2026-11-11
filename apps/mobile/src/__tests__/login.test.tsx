/**
 * Тесты экрана входа: рендер, валидация, вход, ошибка, DEV-кнопка,
 * graceful degradation при недоступном API (Промт 7).
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { AuthUser } from '@bazar/types';
import { AuthError } from '@bazar/types';
import { authApi, type AuthResult } from '../services/api/authApi';
import { __resetAuthStoreForTests, useAuthStore } from '../stores/authStore';
import LoginScreen from '../app/(auth)/login';

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

describe('(auth)/login', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    jest.clearAllMocks();
    jest.mocked(authApi.ping).mockResolvedValue(true);
    jest.mocked(router.replace).mockClear();
    jest.mocked(router.push).mockClear();
  });

  it('рендерит логотип, заголовок и поля', async () => {
    const screen = await render(<LoginScreen />);
    expect(screen.getByText('Bazar')).toBeTruthy();
    expect(screen.getByText('Вход в Bazar')).toBeTruthy();
    expect(screen.getByLabelText('Телефон')).toBeTruthy();
    expect(screen.getByLabelText('Пароль')).toBeTruthy();
    expect(screen.getByText('Войти')).toBeTruthy();
  });

  it('маска телефона применяется при вводе', async () => {
    const screen = await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    // Перечитываем дерево: пропсы обновились после ререндера
    expect(screen.getByLabelText('Телефон').props.value).toBe(
      '+7 (900) 123-45-67',
    );
  });

  it('переключатель видимости пароля меняет подпись доступности', async () => {
    const screen = await render(<LoginScreen />);
    const toggle = screen.getByLabelText('Показать пароль');
    await fireEvent.press(toggle);
    expect(screen.getByLabelText('Скрыть пароль')).toBeTruthy();
  });

  it('пустые поля → ошибки валидации, логин не вызывается', async () => {
    const screen = await render(<LoginScreen />);
    await fireEvent.press(screen.getByText('Войти'));
    expect(
      screen.getByText('Введите номер полностью: +7 (999) 999-99-99'),
    ).toBeTruthy();
    expect(screen.getByText('Введите пароль')).toBeTruthy();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('успешный вход → сессия в store, экран не навигирует сам (guard ведёт в приложение)', async () => {
    jest.mocked(authApi.login).mockResolvedValue(authResult(IVAN));
    const screen = await render(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.changeText(screen.getByLabelText('Пароль'), 'qwerty123');
    await fireEvent.press(screen.getByText('Войти'));

    await waitFor(() => {
      expect(useAuthStore.getState().state).toBe('authenticated');
    });
    // Баг №2: навигацию выполняет только AuthGuard — без собственного
    // router.replace экрана (иначе гонка с Redirect guard'а).
    expect(router.replace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBe('access-u1');
    expect(authApi.login).toHaveBeenCalledWith({
      phone: '+79001234567',
      password: 'qwerty123',
    });
  });

  it('ошибка сервера показывается под кнопкой', async () => {
    jest
      .mocked(authApi.login)
      .mockRejectedValue(
        new AuthError('AUTH_INVALID_CREDENTIALS', 'Неверный номер или пароль'),
      );
    const screen = await render(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001234567');
    await fireEvent.changeText(screen.getByLabelText('Пароль'), 'wrongpass');
    await fireEvent.press(screen.getByText('Войти'));

    await waitFor(() => {
      expect(screen.getByText('Неверный номер или пароль')).toBeTruthy();
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('DEV: быстрая кнопка «Продолжить как Иван Петров» входит под демо-юзером', async () => {
    expect(__DEV__).toBe(true);
    jest.mocked(authApi.login).mockResolvedValue(authResult(IVAN));
    const screen = await render(<LoginScreen />);

    expect(screen.getByText('DEV')).toBeTruthy();
    await fireEvent.press(screen.getByText('Продолжить как Иван Петров'));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        phone: '+79001234567',
        password: 'qwerty123',
      });
      expect(useAuthStore.getState().state).toBe('authenticated');
    });
    // Баг №2: экран не навигирует — маршрутизацию делает AuthGuard.
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('недоступный API → ErrorState «Сервер временно недоступен» с «Повторить»', async () => {
    jest.mocked(authApi.ping).mockResolvedValue(false);
    const screen = await render(<LoginScreen />);

    await waitFor(() => {
      expect(screen.getByText('Сервер временно недоступен')).toBeTruthy();
    });
    // Формы входа нет: мок-режима больше не существует.
    expect(screen.queryByLabelText('Телефон')).toBeNull();

    // «Повторить»: API ожил — снова форма входа.
    jest.mocked(authApi.ping).mockResolvedValue(true);
    await fireEvent.press(screen.getByText('Повторить'));
    await waitFor(() => {
      expect(screen.getByLabelText('Телефон')).toBeTruthy();
    });
  });

  it('ссылки ведут на сброс, OTP и регистрацию', async () => {
    const screen = await render(<LoginScreen />);
    await fireEvent.press(screen.getByText('Забыли пароль?'));
    expect(router.push).toHaveBeenCalledWith('/reset-request');

    await fireEvent.press(screen.getByText('Войти по коду из SMS'));
    expect(router.push).toHaveBeenCalledWith('/otp');

    await fireEvent.press(screen.getByText('Нет аккаунта? Зарегистрироваться'));
    expect(router.push).toHaveBeenCalledWith('/register');
  });
});
