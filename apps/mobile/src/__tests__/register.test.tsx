/**
 * Тесты экрана регистрации: поля, валидация после blur,
 * обязательный чекбокс, успех → сессия (навигацию выполняет AuthGuard).
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { AuthUser, Session } from '@bazar/types';
import { AuthError } from '@bazar/types';
import { authMockService } from '../services/authMock';
import { __resetAuthStoreForTests, useAuthStore } from '../stores/authStore';
import RegisterScreen from '../app/(auth)/register';

jest.mock('../services/authMock');

const NEWBIE: AuthUser = {
  id: 'u2',
  phone: '+79001112233',
  name: 'Мария Иванова',
  createdAt: '2026-01-02T00:00:00.000Z',
  memberships: [],
};

const SESSION: Session = {
  userId: 'u2',
  token: 'token-u2',
  issuedAt: '2026-01-02T00:00:00.000Z',
  expiresAt: '2026-01-09T00:00:00.000Z',
};

/** Результат render из RNTL v14 — асинхронный. */
type Screen = Awaited<ReturnType<typeof render>>;

async function fillValid(screen: Screen) {
  await fireEvent.changeText(screen.getByLabelText('Имя'), 'Мария Иванова');
  await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001112233');
  await fireEvent.changeText(screen.getByLabelText('Пароль'), 'password1');
  await fireEvent.changeText(
    screen.getByLabelText('Повторите пароль'),
    'password1',
  );
  await fireEvent.press(
    screen.getByLabelText('Принимаю условия и политику конфиденциальности'),
  );
}

describe('(auth)/register', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    jest.clearAllMocks();
    jest.mocked(router.replace).mockClear();
  });

  it('рендерит все поля и чекбокс', async () => {
    const screen = await render(<RegisterScreen />);
    expect(screen.getByText('Регистрация в Bazar')).toBeTruthy();
    expect(screen.getByLabelText('Имя')).toBeTruthy();
    expect(screen.getByLabelText('Телефон')).toBeTruthy();
    expect(screen.getByLabelText('Пароль')).toBeTruthy();
    expect(screen.getByLabelText('Повторите пароль')).toBeTruthy();
    expect(
      screen.getByLabelText('Принимаю условия и политику конфиденциальности'),
    ).toBeTruthy();
  });

  it('ошибки скрыты до blur и появляются после', async () => {
    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Имя'), 'М');
    // До blur ошибки нет
    expect(screen.queryByText('Введите имя (минимум 2 символа)')).toBeNull();
    await fireEvent(screen.getByLabelText('Имя'), 'blur');
    expect(screen.getByText('Введите имя (минимум 2 символа)')).toBeTruthy();
  });

  it('пароль без цифр отклоняется', async () => {
    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Пароль'), 'passwordword');
    await fireEvent.press(screen.getByText('Зарегистрироваться'));
    expect(screen.getByText('Нужны буквы и цифры')).toBeTruthy();
  });

  it('пароли не совпадают', async () => {
    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Пароль'), 'password1');
    await fireEvent.changeText(
      screen.getByLabelText('Повторите пароль'),
      'password2',
    );
    await fireEvent.press(screen.getByText('Зарегистрироваться'));
    expect(screen.getByText('Пароли не совпадают')).toBeTruthy();
  });

  it('без чекбокса отправка невозможна', async () => {
    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Имя'), 'Мария Иванова');
    await fireEvent.changeText(screen.getByLabelText('Телефон'), '79001112233');
    await fireEvent.changeText(screen.getByLabelText('Пароль'), 'password1');
    await fireEvent.changeText(
      screen.getByLabelText('Повторите пароль'),
      'password1',
    );
    await fireEvent.press(screen.getByText('Зарегистрироваться'));

    expect(screen.getByText('Нужно принять условия')).toBeTruthy();
    expect(authMockService.register).not.toHaveBeenCalled();
  });

  it('успех → сессия в store, экран не навигирует сам (guard ведёт на /welcome)', async () => {
    jest
      .mocked(authMockService.register)
      .mockResolvedValue({ user: NEWBIE, session: SESSION });
    const screen = await render(<RegisterScreen />);
    await fillValid(screen);

    await fireEvent.press(screen.getByText('Зарегистрироваться'));
    await waitFor(() => {
      expect(useAuthStore.getState().state).toBe('authenticated');
    });
    // Баг №2: навигацию выполняет только AuthGuard — экран не делает
    // собственный router.replace, иначе гонка уводит в /(tabs).
    expect(router.replace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toEqual(NEWBIE);
    expect(authMockService.register).toHaveBeenCalledWith({
      name: 'Мария Иванова',
      phone: '+79001112233',
      password: 'password1',
    });
  });

  it('занятый телефон → ошибка сервера под кнопкой', async () => {
    jest
      .mocked(authMockService.register)
      .mockRejectedValue(new AuthError('AUTH_USER_EXISTS', 'Занят'));
    const screen = await render(<RegisterScreen />);
    await fillValid(screen);

    await fireEvent.press(screen.getByText('Зарегистрироваться'));
    await waitFor(() => {
      expect(screen.getByText('Этот номер уже зарегистрирован')).toBeTruthy();
    });
    expect(router.replace).not.toHaveBeenCalled();
  });
});
