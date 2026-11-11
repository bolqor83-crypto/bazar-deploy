/**
 * Тесты стора онбординга: шаги, возобновление, завершение
 * с синхронизацией contextStore и authStore.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser } from '@bazar/types';
import { OnboardingError } from '@bazar/types';
import { onboardingMockService } from '../services/onboardingMock';
import { authMockService } from '../services/authMock';
import { __resetAuthStoreForTests, useAuthStore } from './authStore';
import { useContextStore } from './contextStore';
import {
  __resetOnboardingStoreForTests,
  ONBOARDING_STATE_KEY,
  useOnboardingStore,
} from './onboardingStore';

jest.mock('../services/onboardingMock');
jest.mock('../services/authMock');

const NEWBIE: AuthUser = {
  id: 'u9',
  phone: '+79005556677',
  name: 'Мария Иванова',
  createdAt: '2026-01-02T00:00:00.000Z',
  memberships: [],
};

function authenticate(user: AuthUser = NEWBIE): void {
  useAuthStore.setState({
    state: 'authenticated',
    user,
    token: 'token-u9',
    error: null,
  });
}

const ORG_DATA = {
  name: 'Фермерский двор',
  kind: 'retail' as const,
  address: 'ул. Садовая, 12',
};

const LOC_DATA = { name: 'Точка на Западном', address: 'ул. Западная, 3' };

describe('onboardingStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetAuthStoreForTests();
    __resetOnboardingStoreForTests();
    useContextStore.setState({
      active: {
        userId: '',
        role: 'customer',
        organizationId: null,
        locationId: null,
      },
      memberships: [],
      hydrated: true,
    });
    jest.clearAllMocks();
  });

  describe('hydrate', () => {
    it('восстанавливает прогресс из bazar.onboarding.state', async () => {
      await AsyncStorage.setItem(
        ONBOARDING_STATE_KEY,
        JSON.stringify({
          step: 'location',
          role: 'store_owner',
          organizationDraft: ORG_DATA,
          locationDraft: null,
          createdOrganizationId: 'ob-org-1',
          createdLocationId: null,
        }),
      );
      await useOnboardingStore.getState().hydrate();
      const s = useOnboardingStore.getState();
      expect(s.hydrated).toBe(true);
      expect(s.step).toBe('location');
      expect(s.role).toBe('store_owner');
      expect(s.createdOrganizationId).toBe('ob-org-1');
      expect(s.organizationDraft?.name).toBe('Фермерский двор');
    });

    it('битая запись → онбординг с первого шага', async () => {
      await AsyncStorage.setItem(ONBOARDING_STATE_KEY, '{не json');
      await useOnboardingStore.getState().hydrate();
      const s = useOnboardingStore.getState();
      expect(s.hydrated).toBe(true);
      expect(s.step).toBe('role');
      expect(s.role).toBeNull();
    });
  });

  describe('start / setRole', () => {
    it('start переводит на шаг выбора роли', () => {
      useOnboardingStore.setState({ step: 'done' });
      useOnboardingStore.getState().start();
      expect(useOnboardingStore.getState().step).toBe('role');
    });

    it('customer → сразу done', () => {
      useOnboardingStore.getState().setRole('customer');
      const s = useOnboardingStore.getState();
      expect(s.role).toBe('customer');
      expect(s.step).toBe('done');
    });

    it('store_owner → organization, wholesale → organization', () => {
      useOnboardingStore.getState().setRole('store_owner');
      expect(useOnboardingStore.getState().step).toBe('organization');
      useOnboardingStore.getState().setRole('wholesale_seller');
      expect(useOnboardingStore.getState().step).toBe('organization');
    });

    it('шаг и роль персистятся', async () => {
      useOnboardingStore.getState().setRole('store_owner');
      const raw = await AsyncStorage.getItem(ONBOARDING_STATE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      expect(parsed?.role).toBe('store_owner');
      expect(parsed?.step).toBe('organization');
    });
  });

  describe('submitOrganization', () => {
    it('без роли → ошибка, сервис не вызывается', async () => {
      const ok = await useOnboardingStore
        .getState()
        .submitOrganization(ORG_DATA);
      expect(ok).toBe(false);
      expect(useOnboardingStore.getState().error).toBe('Сначала выберите роль');
      expect(onboardingMockService.createOrganization).not.toHaveBeenCalled();
    });

    it('создаёт организацию: store_owner → шаг location', async () => {
      authenticate();
      useOnboardingStore.getState().setRole('store_owner');
      jest.mocked(onboardingMockService.createOrganization).mockResolvedValue({
        id: 'ob-org-1',
        name: 'Фермерский двор',
        shortName: 'Фермерский двор',
        kind: 'retail',
      });

      const ok = await useOnboardingStore
        .getState()
        .submitOrganization(ORG_DATA);

      expect(ok).toBe(true);
      const s = useOnboardingStore.getState();
      expect(s.createdOrganizationId).toBe('ob-org-1');
      expect(s.step).toBe('location');
      expect(s.submitting).toBe(false);
      // Тип организации выведен из роли.
      expect(onboardingMockService.createOrganization).toHaveBeenCalledWith(
        'u9',
        { ...ORG_DATA, kind: 'retail' },
      );
      // Организация зарегистрирована в contextStore.
      expect(
        useContextStore.getState().organizations.map((o) => o.id),
      ).toContain('ob-org-1');
    });

    it('оптовик: после организации → done', async () => {
      authenticate();
      useOnboardingStore.getState().setRole('wholesale_seller');
      jest.mocked(onboardingMockService.createOrganization).mockResolvedValue({
        id: 'ob-org-2',
        name: 'Фермерский двор',
        shortName: 'Фермерский двор',
        kind: 'wholesale',
      });

      const ok = await useOnboardingStore
        .getState()
        .submitOrganization({ ...ORG_DATA, kind: 'wholesale' });
      expect(ok).toBe(true);
      expect(useOnboardingStore.getState().step).toBe('done');
      expect(onboardingMockService.createOrganization).toHaveBeenCalledWith(
        'u9',
        { ...ORG_DATA, kind: 'wholesale' },
      );
    });

    it('ошибка валидации → текст ошибки, шаг не меняется', async () => {
      authenticate();
      useOnboardingStore.getState().setRole('carrier');
      jest
        .mocked(onboardingMockService.createOrganization)
        .mockRejectedValue(
          new OnboardingError('ONBOARDING_INVALID_NAME', 'коротко'),
        );

      const ok = await useOnboardingStore
        .getState()
        .submitOrganization(ORG_DATA);
      expect(ok).toBe(false);
      const s = useOnboardingStore.getState();
      expect(s.error).toBe('Введите название — минимум 2 символа');
      expect(s.step).toBe('organization');
      expect(s.submitting).toBe(false);
    });

    it('возобновление: организация уже создана — повторно не создаётся', async () => {
      authenticate();
      useOnboardingStore.setState({
        role: 'store_owner',
        createdOrganizationId: 'ob-org-1',
      });
      const ok = await useOnboardingStore
        .getState()
        .submitOrganization(ORG_DATA);
      expect(ok).toBe(true);
      expect(onboardingMockService.createOrganization).not.toHaveBeenCalled();
      expect(useOnboardingStore.getState().step).toBe('location');
    });
  });

  describe('submitLocation', () => {
    it('создаёт точку и переходит к done', async () => {
      authenticate();
      useOnboardingStore.setState({
        role: 'store_owner',
        step: 'location',
        createdOrganizationId: 'ob-org-1',
      });
      jest.mocked(onboardingMockService.createLocation).mockResolvedValue({
        id: 'ob-loc-1',
        organizationId: 'ob-org-1',
        name: 'Точка на Западном',
        shortName: 'Западный',
        address: 'ул. Западная, 3',
      });

      const ok = await useOnboardingStore.getState().submitLocation(LOC_DATA);
      expect(ok).toBe(true);
      const s = useOnboardingStore.getState();
      expect(s.createdLocationId).toBe('ob-loc-1');
      expect(s.step).toBe('done');
      expect(useContextStore.getState().locations.map((l) => l.id)).toContain(
        'ob-loc-1',
      );
    });

    it('без организации → ошибка', async () => {
      authenticate();
      useOnboardingStore.setState({ role: 'store_owner', step: 'location' });
      const ok = await useOnboardingStore.getState().submitLocation(LOC_DATA);
      expect(ok).toBe(false);
      expect(useOnboardingStore.getState().error).toBe(
        'Сначала создайте организацию',
      );
    });
  });

  describe('finish', () => {
    it('customer: без членств, контекст customer', async () => {
      authenticate();
      useContextStore.setState({
        active: {
          userId: 'u9',
          role: 'customer',
          organizationId: null,
          locationId: null,
        },
        memberships: [],
        hydrated: true,
      });
      useOnboardingStore.getState().setRole('customer');

      const ok = await useOnboardingStore.getState().finish();
      expect(ok).toBe(true);
      expect(onboardingMockService.addMembership).not.toHaveBeenCalled();
      expect(useContextStore.getState().active.role).toBe('customer');
    });

    it('store_owner: членство, обновление пользователя, контекст с точкой', async () => {
      authenticate();
      // После входа контекст покупателя (членств не было).
      useContextStore.setState({
        active: {
          userId: 'u9',
          role: 'customer',
          organizationId: null,
          locationId: null,
        },
        memberships: [],
        hydrated: true,
      });
      useOnboardingStore.setState({
        role: 'store_owner',
        step: 'location',
        createdOrganizationId: 'ob-org-1',
        createdLocationId: 'ob-loc-1',
        organizationDraft: ORG_DATA,
        locationDraft: LOC_DATA,
      });

      jest.mocked(onboardingMockService.addMembership).mockResolvedValue({
        userId: 'u9',
        organizationId: 'ob-org-1',
        role: 'store_owner',
        title: 'Владелец',
      });
      // refreshUser → getSession с обновлёнными членствами.
      jest.mocked(authMockService.getSession).mockResolvedValue({
        user: {
          ...NEWBIE,
          memberships: [
            {
              userId: 'u9',
              organizationId: 'ob-org-1',
              role: 'store_owner',
              title: 'Владелец',
            },
          ],
        },
        session: {
          userId: 'u9',
          token: 'token-u9',
          issuedAt: '2026-01-02T00:00:00.000Z',
          expiresAt: '2026-01-09T00:00:00.000Z',
        },
      });
      // Точка, созданная на шаге location, известна contextStore.
      useContextStore.getState().registerLocations([
        {
          id: 'ob-loc-1',
          organizationId: 'ob-org-1',
          name: 'Точка на Западном',
          shortName: 'Западный',
          address: 'ул. Западная, 3',
        },
      ]);

      const ok = await useOnboardingStore.getState().finish();

      expect(ok).toBe(true);
      expect(onboardingMockService.addMembership).toHaveBeenCalledWith(
        'u9',
        'ob-org-1',
        'store_owner',
      );
      // Пользователь в authStore обновился (OnboardingGuard пропустит).
      expect(useAuthStore.getState().user?.memberships).toHaveLength(1);
      // Контекст: роль store_owner, новая организация и точка.
      const active = useContextStore.getState().active;
      expect(active.role).toBe('store_owner');
      expect(active.organizationId).toBe('ob-org-1');
      expect(active.locationId).toBe('ob-loc-1');
    });

    it('без сессии → false и ошибка', async () => {
      useOnboardingStore.setState({ role: 'store_owner' });
      const ok = await useOnboardingStore.getState().finish();
      expect(ok).toBe(false);
      expect(useOnboardingStore.getState().error).toBe(
        'Сессия истекла. Войдите заново',
      );
    });
  });

  describe('reset', () => {
    it('очищает прогресс и хранилище', async () => {
      useOnboardingStore.setState({
        step: 'done',
        role: 'store_owner',
        createdOrganizationId: 'ob-org-1',
      });
      useOnboardingStore.getState().reset();
      const s = useOnboardingStore.getState();
      expect(s.step).toBe('role');
      expect(s.role).toBeNull();
      expect(s.createdOrganizationId).toBeNull();
      expect(await AsyncStorage.getItem(ONBOARDING_STATE_KEY)).toBeNull();
    });
  });
});
