/**
 * Моковые данные контекста Bazar.
 *
 * Один пользователь, несколько членств: опт, две розничные сети,
 * логистика. Плюс режим покупателя (без организации).
 *
 * Моки типизированы через @bazar/types. Когда появится API —
 * заменить источник данных, типы останутся.
 *
 * Примечание: членство-перевозчик (o4, «Транс-Логистик») добавлено
 * сверх минимального состава из спецификации, чтобы роль carrier
 * была достижима в UI (иначе tab bar перевозчика не показать).
 */
import type {
  BusinessLocation,
  Membership,
  Organization,
  User,
} from '@bazar/types';

export const mockUser: User = {
  id: 'u1',
  fullName: 'Иван Петров',
  initials: 'ИП',
};

export const mockOrganizations: Organization[] = [
  {
    id: 'o1',
    name: 'Опт-Юг',
    shortName: 'Опт-Юг',
    kind: 'wholesale',
  },
  {
    id: 'o2',
    name: 'Сеть «У дома»',
    shortName: 'У дома',
    kind: 'retail',
  },
  {
    id: 'o3',
    name: 'Магазин «Ромашка»',
    shortName: 'Ромашка',
    kind: 'retail',
  },
  {
    id: 'o4',
    name: 'Транс-Логистик',
    shortName: 'Транс-Логистик',
    kind: 'logistics',
  },
];

export const mockLocations: BusinessLocation[] = [
  {
    id: 'l1',
    organizationId: 'o2',
    name: 'Точка на Садовой',
    shortName: 'Садовая',
    address: 'ул. Садовая, 12',
  },
  {
    id: 'l2',
    organizationId: 'o2',
    name: 'Точка на Доватора',
    shortName: 'Доватора',
    address: 'ул. Доватора, 45',
  },
  {
    id: 'l3',
    organizationId: 'o2',
    name: 'Точка в Аксае',
    shortName: 'Аксай',
    address: 'г. Аксай, пр. Ленина, 3',
  },
  {
    id: 'l4',
    organizationId: 'o3',
    name: 'Ромашка — главный зал',
    shortName: 'Главный зал',
    address: 'ул. Большая Садовая, 101',
  },
];

export const mockMemberships: Membership[] = [
  {
    userId: 'u1',
    organizationId: 'o1',
    role: 'wholesale_seller',
    title: 'Владелец',
  },
  {
    userId: 'u1',
    organizationId: 'o2',
    role: 'store_owner',
    title: 'Владелец',
  },
  {
    userId: 'u1',
    organizationId: 'o3',
    role: 'store_owner',
    title: 'Управляющий',
  },
  {
    userId: 'u1',
    organizationId: 'o4',
    role: 'carrier',
    title: 'Водитель-экспедитор',
  },
];

/**
 * Контекст покупателя по умолчанию.
 *
 * userId пустой: это гостевой контекст, а не контекст мок-юзера.
 * Если бы здесь стоял id пользователя, syncWithUser при первом входе
 * считал бы его «тем же» и не применял приоритет членств.
 */
export const customerContext = {
  userId: '',
  role: 'customer',
  organizationId: null,
  locationId: null,
} as const;
