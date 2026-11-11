/**
 * Тесты экранов онбординга: приветствие, выбор роли, организация,
 * точка, финал. Навигация мокается (expo-router), стор — реальный.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { OnboardingError, type AuthUser } from '@bazar/types';
import { onboardingMockService } from '../services/onboardingMock';
import { __resetAuthStoreForTests, useAuthStore } from '../stores/authStore';
import {
  __resetOnboardingStoreForTests,
  useOnboardingStore,
} from '../stores/onboardingStore';

import WelcomeScreen from '../app/(onboarding)/welcome';
import RoleScreen from '../app/(onboarding)/role';
import OrganizationScreen from '../app/(onboarding)/organization';
import LocationScreen from '../app/(onboarding)/location';
import DoneScreen from '../app/(onboarding)/done';

jest.mock('../services/onboardingMock');

const NEWBIE: AuthUser = {
  id: 'u9',
  phone: '+79005556677',
  name: 'Мария Иванова',
  createdAt: '2026-01-02T00:00:00.000Z',
  memberships: [],
};

type Screen = Awaited<ReturnType<typeof render>>;

describe('(onboarding)/welcome', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    __resetOnboardingStoreForTests();
    jest.clearAllMocks();
  });

  it('показывает приветствие и кнопку начала', async () => {
    const screen = await render(<WelcomeScreen />);
    expect(screen.getByText('Добро пожаловать в Bazar')).toBeTruthy();
    expect(screen.getByText('Начать настройку')).toBeTruthy();
  });

  it('«Начать настройку» → шаг role и переход на /role', async () => {
    const screen = await render(<WelcomeScreen />);
    await fireEvent.press(screen.getByText('Начать настройку'));
    expect(useOnboardingStore.getState().step).toBe('role');
    expect(router.push).toHaveBeenCalledWith('/role');
  });
});

describe('(onboarding)/role', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    __resetOnboardingStoreForTests();
    jest.clearAllMocks();
    jest.mocked(router.push).mockClear();
  });

  it('четыре карточки ролей, «Продолжить» неактивен без выбора', async () => {
    const screen = await render(<RoleScreen />);
    expect(screen.getByText('Покупатель')).toBeTruthy();
    expect(screen.getByText('Владелец точки')).toBeTruthy();
    expect(screen.getByText('Оптовик')).toBeTruthy();
    expect(screen.getByText('Перевозчик')).toBeTruthy();
    expect(screen.getByLabelText('Выбор роли')).toBeTruthy();

    const button = screen.getByRole('button', { name: 'Продолжить' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('выбор роли отмечает карточку', async () => {
    const screen = await render(<RoleScreen />);
    await fireEvent.press(screen.getByLabelText('Владелец точки'));
    expect(
      screen.getByLabelText('Владелец точки').props.accessibilityState
        ?.selected,
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Продолжить' }).props
        .accessibilityState?.disabled,
    ).toBe(false);
  });

  it('customer + «Продолжить» → /done и шаг done', async () => {
    const screen = await render(<RoleScreen />);
    await fireEvent.press(screen.getByLabelText('Покупатель'));
    await fireEvent.press(screen.getByText('Продолжить'));
    expect(router.push).toHaveBeenCalledWith('/done');
    expect(useOnboardingStore.getState().role).toBe('customer');
    expect(useOnboardingStore.getState().step).toBe('done');
  });

  it('store_owner + «Продолжить» → /organization', async () => {
    const screen = await render(<RoleScreen />);
    await fireEvent.press(screen.getByLabelText('Владелец точки'));
    await fireEvent.press(screen.getByText('Продолжить'));
    expect(router.push).toHaveBeenCalledWith('/organization');
  });

  it('возобновление: ранее выбранная роль подсвечена', async () => {
    useOnboardingStore.setState({ role: 'carrier' });
    const screen = await render(<RoleScreen />);
    expect(
      screen.getByLabelText('Перевозчик').props.accessibilityState?.selected,
    ).toBe(true);
  });
});

describe('(onboarding)/organization', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    __resetOnboardingStoreForTests();
    useAuthStore.setState({
      state: 'authenticated',
      user: NEWBIE,
      token: 'token-u9',
      error: null,
    });
    jest.clearAllMocks();
    jest.mocked(router.push).mockClear();
  });

  async function fillForm(screen: Screen): Promise<void> {
    await fireEvent.changeText(
      screen.getByLabelText('Название'),
      'Фермерский двор',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Адрес'),
      'ул. Садовая, 12',
    );
  }

  it('отправка: store_owner → /location', async () => {
    useOnboardingStore.setState({ role: 'store_owner', step: 'organization' });
    jest.mocked(onboardingMockService.createOrganization).mockResolvedValue({
      id: 'ob-org-1',
      name: 'Фермерский двор',
      shortName: 'Фермерский двор',
      kind: 'retail',
    });
    const screen = await render(<OrganizationScreen />);
    await fillForm(screen);
    await fireEvent.press(screen.getByText('Продолжить'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/location');
    });
    expect(useOnboardingStore.getState().createdOrganizationId).toBe(
      'ob-org-1',
    );
  });

  it('отправка: оптовик → /done', async () => {
    useOnboardingStore.setState({
      role: 'wholesale_seller',
      step: 'organization',
    });
    jest.mocked(onboardingMockService.createOrganization).mockResolvedValue({
      id: 'ob-org-2',
      name: 'Фермерский двор',
      shortName: 'Фермерский двор',
      kind: 'wholesale',
    });
    const screen = await render(<OrganizationScreen />);
    await fillForm(screen);
    await fireEvent.press(screen.getByText('Продолжить'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/done');
    });
  });

  it('черновик восстанавливается после перезагрузки', async () => {
    useOnboardingStore.setState({
      role: 'store_owner',
      step: 'organization',
      organizationDraft: {
        name: 'Фермерский двор',
        kind: 'retail',
        address: 'ул. Садовая, 12',
      },
    });
    const screen = await render(<OrganizationScreen />);
    expect(screen.getByDisplayValue('Фермерский двор')).toBeTruthy();
    expect(screen.getByDisplayValue('ул. Садовая, 12')).toBeTruthy();
  });

  it('ошибка сервиса показывается на экране', async () => {
    useOnboardingStore.setState({ role: 'carrier', step: 'organization' });
    jest
      .mocked(onboardingMockService.createOrganization)
      .mockRejectedValue(
        new OnboardingError('ONBOARDING_INVALID_ADDRESS', 'коротко'),
      );
    const screen = await render(<OrganizationScreen />);
    await fillForm(screen);
    await fireEvent.press(screen.getByText('Продолжить'));

    await waitFor(() => {
      expect(
        screen.getByText('Введите адрес — минимум 5 символов'),
      ).toBeTruthy();
    });
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('(onboarding)/location', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    __resetOnboardingStoreForTests();
    useAuthStore.setState({
      state: 'authenticated',
      user: NEWBIE,
      token: 'token-u9',
      error: null,
    });
    jest.clearAllMocks();
    jest.mocked(router.push).mockClear();
  });

  it('отправка создаёт точку и ведёт на /done', async () => {
    useOnboardingStore.setState({
      role: 'store_owner',
      step: 'location',
      createdOrganizationId: 'ob-org-1',
      organizationDraft: {
        name: 'Фермерский двор',
        kind: 'retail',
        address: 'ул. Садовая, 12',
      },
    });
    jest.mocked(onboardingMockService.createLocation).mockResolvedValue({
      id: 'ob-loc-1',
      organizationId: 'ob-org-1',
      name: 'Точка на Западном',
      shortName: 'Западный',
      address: 'ул. Западная, 3',
    });
    const screen = await render(<LocationScreen />);
    expect(screen.getByText(/Фермерский двор/)).toBeTruthy();

    await fireEvent.changeText(
      screen.getByLabelText('Название точки'),
      'Точка на Западном',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Адрес'),
      'ул. Западная, 3',
    );
    await fireEvent.press(screen.getByText('Продолжить'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/done');
    });
    expect(useOnboardingStore.getState().createdLocationId).toBe('ob-loc-1');
  });
});

describe('(onboarding)/done', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    __resetOnboardingStoreForTests();
    useAuthStore.setState({
      state: 'authenticated',
      user: NEWBIE,
      token: 'token-u9',
      error: null,
    });
    jest.clearAllMocks();
    jest.mocked(router.replace).mockClear();
  });

  it('показывает сводку настройки', async () => {
    useOnboardingStore.setState({
      role: 'store_owner',
      step: 'done',
      organizationDraft: {
        name: 'Фермерский двор',
        kind: 'retail',
        address: 'ул. Садовая, 12',
      },
      locationDraft: { name: 'Точка на Западном', address: 'ул. Западная, 3' },
    });
    const screen = await render(<DoneScreen />);
    expect(screen.getByText('Всё готово')).toBeTruthy();
    expect(screen.getByText('Владелец точки')).toBeTruthy();
    expect(screen.getByText('Фермерский двор')).toBeTruthy();
    expect(screen.getByText('Точка на Западном')).toBeTruthy();
  });

  it('«Начать работу» → finish и переход в /(tabs)', async () => {
    useOnboardingStore.setState({
      role: 'customer',
      step: 'done',
    });
    const screen = await render(<DoneScreen />);
    await fireEvent.press(screen.getByText('Начать работу'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
    expect(useOnboardingStore.getState().step).toBe('done');
  });
});
