/**
 * Тесты мок-сервиса онбординга: валидация, создание сущностей,
 * идемпотентность членств, объединение с моками Промта 3.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingError } from '@bazar/types';
import {
  __clearOnboardingStorageForTests,
  ONBOARDING_LOCATIONS_KEY,
  ONBOARDING_MEMBERSHIPS_KEY,
  ONBOARDING_ORGS_KEY,
  onboardingMockService,
} from '../onboardingMock';

describe('onboardingMockService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await __clearOnboardingStorageForTests();
  });

  describe('createOrganization', () => {
    it('короткое название → OnboardingError INVALID_NAME', async () => {
      await expect(
        onboardingMockService.createOrganization('u9', {
          name: 'Ф',
          kind: 'retail',
          address: 'ул. Садовая, 12',
        }),
      ).rejects.toMatchObject({ code: 'ONBOARDING_INVALID_NAME' });
      await expect(
        onboardingMockService.createOrganization('u9', {
          name: '   ',
          kind: 'retail',
          address: 'ул. Садовая, 12',
        }),
      ).rejects.toBeInstanceOf(OnboardingError);
    });

    it('короткий адрес → OnboardingError INVALID_ADDRESS', async () => {
      await expect(
        onboardingMockService.createOrganization('u9', {
          name: 'Фермерский двор',
          kind: 'wholesale',
          address: 'дом',
        }),
      ).rejects.toMatchObject({ code: 'ONBOARDING_INVALID_ADDRESS' });
    });

    it('создаёт организацию с типом и коротким названием', async () => {
      const org = await onboardingMockService.createOrganization('u9', {
        name: 'Фермерский двор Александра',
        kind: 'retail',
        address: 'г. Ростов-на-Дону, ул. Садовая, 12',
      });
      expect(org.kind).toBe('retail');
      expect(org.name).toBe('Фермерский двор Александра');
      expect(org.shortName).toBe('Фермерский двор');
      expect(org.id).toMatch(/^ob-org-/);

      const raw = await AsyncStorage.getItem(ONBOARDING_ORGS_KEY);
      const stored = raw ? (JSON.parse(raw) as unknown[]) : [];
      expect(stored).toHaveLength(1);
    });
  });

  describe('createLocation', () => {
    it('валидация названия и адреса', async () => {
      await expect(
        onboardingMockService.createLocation('u9', 'ob-org-1', {
          name: 'Т',
          address: 'ул. Садовая, 12',
        }),
      ).rejects.toMatchObject({ code: 'ONBOARDING_INVALID_NAME' });
      await expect(
        onboardingMockService.createLocation('u9', 'ob-org-1', {
          name: 'Точка на Западном',
          address: 'дом',
        }),
      ).rejects.toMatchObject({ code: 'ONBOARDING_INVALID_ADDRESS' });
    });

    it('создаёт точку, привязанную к организации', async () => {
      const loc = await onboardingMockService.createLocation('u9', 'ob-org-1', {
        name: 'Точка на Западном',
        address: 'ул. Западная, 3',
      });
      expect(loc.organizationId).toBe('ob-org-1');
      expect(loc.id).toMatch(/^ob-loc-/);
      const raw = await AsyncStorage.getItem(ONBOARDING_LOCATIONS_KEY);
      const stored = raw ? (JSON.parse(raw) as unknown[]) : [];
      expect(stored).toHaveLength(1);
    });
  });

  describe('addMembership', () => {
    it('записывает членство в bazar.onboarding.memberships', async () => {
      const membership = await onboardingMockService.addMembership(
        'u9',
        'ob-org-1',
        'store_owner',
      );
      expect(membership.role).toBe('store_owner');
      expect(membership.title).toBe('Владелец');

      const rawMemberships = await AsyncStorage.getItem(
        ONBOARDING_MEMBERSHIPS_KEY,
      );
      expect(rawMemberships ? JSON.parse(rawMemberships) : []).toHaveLength(1);
    });

    it('идемпотентен: повторный вызов не создаёт дубль', async () => {
      await onboardingMockService.addMembership('u9', 'ob-org-1', 'carrier');
      await onboardingMockService.addMembership('u9', 'ob-org-1', 'carrier');

      const rawMemberships = await AsyncStorage.getItem(
        ONBOARDING_MEMBERSHIPS_KEY,
      );
      expect(rawMemberships ? JSON.parse(rawMemberships) : []).toHaveLength(1);
    });
  });

  describe('listForUser', () => {
    it('отдаёт организации, точки и членства только этого пользователя', async () => {
      const org = await onboardingMockService.createOrganization('u9', {
        name: 'Фермерский двор',
        kind: 'retail',
        address: 'ул. Садовая, 12',
      });
      await onboardingMockService.createLocation('u9', org.id, {
        name: 'Точка на Западном',
        address: 'ул. Западная, 3',
      });
      await onboardingMockService.addMembership('u9', org.id, 'store_owner');
      // Чужие данные того же хранилища.
      await onboardingMockService.createOrganization('u8', {
        name: 'Чужой склад',
        kind: 'wholesale',
        address: 'ул. Чужая, 99',
      });

      const world = await onboardingMockService.listForUser('u9');
      expect(world.organizations).toHaveLength(1);
      expect(world.organizations[0]?.name).toBe('Фермерский двор');
      expect(world.locations).toHaveLength(1);
      expect(world.memberships).toHaveLength(1);
      expect(world.memberships[0]?.role).toBe('store_owner');
    });

    it('пуст для пользователя без онбординга', async () => {
      const world = await onboardingMockService.listForUser('u42');
      expect(world.organizations).toEqual([]);
      expect(world.locations).toEqual([]);
      expect(world.memberships).toEqual([]);
    });
  });

  describe('объединение с моками Промта 3', () => {
    it('getAllOrganizations: моки Ивана + созданные, без перезаписи', async () => {
      await onboardingMockService.createOrganization('u9', {
        name: 'Фермерский двор',
        kind: 'retail',
        address: 'ул. Садовая, 12',
      });
      const all = await onboardingMockService.getAllOrganizations();
      const ids = all.map((o) => o.id);
      expect(ids).toContain('o1');
      expect(ids).toContain('o2');
      expect(all.filter((o) => o.name === 'Опт-Юг')).toHaveLength(1);
      expect(all).toHaveLength(5);
    });

    it('getAllLocations и getAllMemberships включают созданное', async () => {
      await onboardingMockService.createLocation('u9', 'ob-org-1', {
        name: 'Точка на Западном',
        address: 'ул. Западная, 3',
      });
      await onboardingMockService.addMembership('u9', 'ob-org-1', 'carrier');

      const locations = await onboardingMockService.getAllLocations();
      expect(locations.map((l) => l.id)).toContain('l1');
      expect(locations).toHaveLength(5);

      const memberships = await onboardingMockService.getAllMemberships();
      expect(memberships.map((m) => m.role)).toContain('carrier');
      expect(memberships).toHaveLength(5);
    });
  });
});
