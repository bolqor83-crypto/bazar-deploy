/**
 * Тесты contextStore: смена роли/организации/точки,
 * персистентность и откат невалидного контекста.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveContext } from '@bazar/types';
import { customerContext, mockMemberships } from '../mocks/context';
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

  it('начальный контекст — покупатель без организации', () => {
    const { active } = useContextStore.getState();
    expect(active).toEqual({ userId: 'u1', role: 'customer', organizationId: null, locationId: null });
  });

  it('setRole переключает роль и добирает первую организацию', () => {
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
    expect(useContextStore.getState().active).toEqual({ ...customerContext });
  });

  it('setOrganization меняет организацию и сбрасывает точку', () => {
    resetStore({ userId: 'u1', role: 'store_owner', organizationId: 'o2', locationId: 'l1' });
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

    resetStore({ userId: 'u1', role: 'store_owner', organizationId: 'o2', locationId: null });
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
        { userId: 'u1', role: 'store_owner', organizationId: 'o2', locationId: 'l3' },
        mockMemberships
      );
      expect(result).toEqual({
        userId: 'u1',
        role: 'store_owner',
        organizationId: 'o2',
        locationId: 'l3',
      });
    });

    it('роль исчезла (нет членства) → null', () => {
      const withoutCarrier = mockMemberships.filter((m) => m.role !== 'carrier');
      const result = validateContext(
        { userId: 'u1', role: 'carrier', organizationId: 'o4', locationId: null },
        withoutCarrier
      );
      expect(result).toBeNull();
    });

    it('организация недоступна → null', () => {
      const result = validateContext(
        { userId: 'u1', role: 'wholesale_seller', organizationId: 'o2', locationId: null },
        mockMemberships
      );
      expect(result).toBeNull();
    });

    it('несуществующая роль → null', () => {
      const result = validateContext(
        { userId: 'u1', role: 'admin', organizationId: null, locationId: null } as never,
        mockMemberships
      );
      expect(result).toBeNull();
    });

    it('customer нормализуется: лишние организация/точка отбрасываются', () => {
      const result = validateContext(
        { userId: 'u1', role: 'customer', organizationId: 'o2', locationId: 'l1' },
        mockMemberships
      );
      expect(result).toEqual({ userId: 'u1', role: 'customer', organizationId: null, locationId: null });
    });

    it('carrier без организации валиден', () => {
      const result = validateContext(
        { userId: 'u1', role: 'carrier', organizationId: null, locationId: null },
        mockMemberships
      );
      expect(result).toEqual({ userId: 'u1', role: 'carrier', organizationId: null, locationId: null });
    });

    it('мусорный объект → null', () => {
      expect(validateContext(null, mockMemberships)).toBeNull();
      expect(validateContext(undefined, mockMemberships)).toBeNull();
    });
  });

  describe('normalizeForRole', () => {
    it('store_owner подхватывает первую организацию роли', () => {
      const result = normalizeForRole(
        { userId: 'u1', role: 'store_owner', organizationId: 'o1', locationId: 'l1' },
        mockMemberships
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
        { userId: 'u1', role: 'carrier', organizationId: 'o4', locationId: null },
        mockMemberships
      );
      expect(result.organizationId).toBe('o4');
    });
  });
});
