/**
 * Тесты contextStore: смена роли/организации/точки,
 * персистентность и откат невалидного контекста.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveContext } from '@bazar/types';
import {
  customerContext,
  mockLocations,
  mockMemberships,
  mockOrganizations,
} from '../mocks/context';
import {
  CONTEXT_STORAGE_KEY,
  normalizeForRole,
  useContextStore,
  validateContext,
} from './contextStore';

/** Сброс стора к исходному состоянию. */
function resetStore(active?: ActiveContext) {
  useContextStore.setState({
    active: active ?? { ...customerContext },
    memberships: mockMemberships,
    hydrated: true,
  });
}

describe('contextStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('начальный контекст — гость-покупатель без пользователя и организации', () => {
    const { active } = useContextStore.getState();
    expect(active).toEqual({
      userId: '',
      role: 'customer',
      organizationId: null,
      locationId: null,
    });
  });

  it('setRole переключает роль и добирает первую организацию', () => {
    // Контекст уже вошедшего Ивана в режиме покупателя
    resetStore({
      userId: 'u1',
      role: 'customer',
      organizationId: null,
      locationId: null,
    });
    useContextStore.getState().setRole('store_owner');
    expect(useContextStore.getState().active).toEqual({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o2', // первое членство store_owner
      locationId: null,
    });

    useContextStore.getState().setRole('wholesale_seller');
    expect(useContextStore.getState().active).toEqual({
      userId: 'u1',
      role: 'wholesale_seller',
      organizationId: 'o1',
      locationId: null,
    });
  });

  it('setRole("customer") чистит организацию и точку', () => {
    resetStore({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o2',
      locationId: 'l1',
    });
    useContextStore.getState().setRole('customer');
    expect(useContextStore.getState().active).toEqual({
      userId: 'u1',
      role: 'customer',
      organizationId: null,
      locationId: null,
    });
  });

  it('setOrganization меняет организацию и сбрасывает точку', () => {
    resetStore({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o2',
      locationId: 'l1',
    });
    useContextStore.getState().setOrganization('o3');
    expect(useContextStore.getState().active).toEqual({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o3',
      locationId: null,
    });
  });

  it('setLocation работает только для store_owner', () => {
    useContextStore.getState().setLocation('l1');
    // customer — точка не применима, изменения нет
    expect(useContextStore.getState().active.locationId).toBeNull();

    resetStore({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o2',
      locationId: null,
    });
    useContextStore.getState().setLocation('l2');
    expect(useContextStore.getState().active.locationId).toBe('l2');
  });

  it('setActive принимает валидный контекст', () => {
    useContextStore.getState().setActive({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o3',
      locationId: 'l4',
    });
    expect(useContextStore.getState().active).toEqual({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o3',
      locationId: 'l4',
    });
  });

  it('setActive откатывает невалидный контекст на покупателя', () => {
    // o1 — опт, не членство store_owner
    useContextStore.getState().setActive({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o1',
      locationId: null,
    });
    expect(useContextStore.getState().active).toEqual({ ...customerContext });
  });

  it('setActive нормализует точку, не принадлежащую организации', () => {
    useContextStore.getState().setActive({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o2',
      locationId: 'l4', // точка «Ромашки», не «У дома»
    });
    expect(useContextStore.getState().active.locationId).toBeNull();
  });

  it('персистит active в AsyncStorage под ключом bazar.context.active', async () => {
    useContextStore.getState().setActive({
      userId: 'u1',
      role: 'wholesale_seller',
      organizationId: 'o1',
      locationId: null,
    });
    // Персист пишет асинхронно — даём микрозадачам выполниться
    await new Promise<void>((resolve) => {
      setImmediate(() => resolve());
    });
    const raw = await AsyncStorage.getItem(CONTEXT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw ?? '{}');
    expect(stored.state.active).toEqual({
      userId: 'u1',
      role: 'wholesale_seller',
      organizationId: 'o1',
      locationId: null,
    });
  });

  describe('validateContext (откат при гидратации)', () => {
    it('валидный store_owner с точкой проходит', () => {
      const result = validateContext(
        {
          userId: 'u1',
          role: 'store_owner',
          organizationId: 'o2',
          locationId: 'l3',
        },
        mockMemberships,
      );
      expect(result).toEqual({
        userId: 'u1',
        role: 'store_owner',
        organizationId: 'o2',
        locationId: 'l3',
      });
    });

    it('роль исчезла (нет членства) → null', () => {
      const withoutCarrier = mockMemberships.filter(
        (m) => m.role !== 'carrier',
      );
      const result = validateContext(
        {
          userId: 'u1',
          role: 'carrier',
          organizationId: 'o4',
          locationId: null,
        },
        withoutCarrier,
      );
      expect(result).toBeNull();
    });

    it('организация недоступна → null', () => {
      const result = validateContext(
        {
          userId: 'u1',
          role: 'wholesale_seller',
          organizationId: 'o2',
          locationId: null,
        },
        mockMemberships,
      );
      expect(result).toBeNull();
    });

    it('несуществующая роль → null', () => {
      const result = validateContext(
        {
          userId: 'u1',
          role: 'admin',
          organizationId: null,
          locationId: null,
        } as never,
        mockMemberships,
      );
      expect(result).toBeNull();
    });

    it('customer нормализуется: лишние организация/точка отбрасываются', () => {
      const result = validateContext(
        {
          userId: 'u1',
          role: 'customer',
          organizationId: 'o2',
          locationId: 'l1',
        },
        mockMemberships,
      );
      expect(result).toEqual({
        userId: 'u1',
        role: 'customer',
        organizationId: null,
        locationId: null,
      });
    });

    it('carrier без организации валиден', () => {
      const result = validateContext(
        {
          userId: 'u1',
          role: 'carrier',
          organizationId: null,
          locationId: null,
        },
        mockMemberships,
      );
      expect(result).toEqual({
        userId: 'u1',
        role: 'carrier',
        organizationId: null,
        locationId: null,
      });
    });

    it('мусорный объект → null', () => {
      expect(validateContext(null, mockMemberships)).toBeNull();
      expect(validateContext(undefined, mockMemberships)).toBeNull();
    });
  });

  describe('normalizeForRole', () => {
    it('store_owner подхватывает первую организацию роли', () => {
      const result = normalizeForRole(
        {
          userId: 'u1',
          role: 'store_owner',
          organizationId: 'o1',
          locationId: 'l1',
        },
        mockMemberships,
      );
      expect(result).toEqual({
        userId: 'u1',
        role: 'store_owner',
        organizationId: 'o2',
        locationId: null,
      });
    });

    it('carrier сохраняет организацию, если она его', () => {
      const result = normalizeForRole(
        {
          userId: 'u1',
          role: 'carrier',
          organizationId: 'o4',
          locationId: null,
        },
        mockMemberships,
      );
      expect(result.organizationId).toBe('o4');
    });
  });

  // ---------------------------------------------------------------------
  // Регрессия бага №1 (промт «Запуск и доступ»): первый вход Ивана
  // после холодного старта уводил в customer, а не wholesale.
  // ---------------------------------------------------------------------

  describe('регрессия: холодный старт и первый вход', () => {
    it('гостевой customerContext не содержит id мок-юзера', () => {
      // Если здесь снова окажется 'u1', syncWithUser при входе Ивана
      // сочтёт его «тем же пользователем» и оставит customer.
      expect(customerContext.userId).toBe('');
    });

    it('холодный вход Ивана → контекст wholesale, а не customer', () => {
      // Холодный старт с пустым хранилищем: активен гостевой контекст
      // (ровно его валидирует onRehydrateStorage без сохранённых данных).
      resetStore({ ...customerContext });
      // Вход Ивана: authStore.login вызывает syncWithUser('u1', ...).
      useContextStore.getState().syncWithUser('u1', {
        memberships: mockMemberships,
        organizations: mockOrganizations,
        locations: mockLocations,
      });
      expect(useContextStore.getState().active).toEqual({
        userId: 'u1',
        role: 'wholesale_seller',
        organizationId: 'o1',
        locationId: null,
      });
    });

    it('после logout повторный вход Ивана → снова wholesale', () => {
      useContextStore.getState().syncWithUser('u1', {
        memberships: mockMemberships,
        organizations: mockOrganizations,
        locations: mockLocations,
      });
      // Пользователь ушёл в режим покупателя и вышел
      useContextStore.getState().setRole('customer');
      useContextStore.getState().reset();
      // Повторный вход с чистого листа
      useContextStore.getState().syncWithUser('u1', {
        memberships: mockMemberships,
        organizations: mockOrganizations,
        locations: mockLocations,
      });
      expect(useContextStore.getState().active).toEqual({
        userId: 'u1',
        role: 'wholesale_seller',
        organizationId: 'o1',
        locationId: null,
      });
    });

    it('выбранный контекст того же пользователя не сбрасывается', () => {
      // Ранее выбранный store_owner/o3/l4 сохраняется при повторной
      // синхронизации (например, восстановление сессии после рестарта).
      resetStore({
        userId: 'u1',
        role: 'store_owner',
        organizationId: 'o3',
        locationId: 'l4',
      });
      useContextStore.getState().syncWithUser('u1', {
        memberships: mockMemberships,
        organizations: mockOrganizations,
        locations: mockLocations,
      });
      expect(useContextStore.getState().active).toEqual({
        userId: 'u1',
        role: 'store_owner',
        organizationId: 'o3',
        locationId: 'l4',
      });
    });
  });
});
