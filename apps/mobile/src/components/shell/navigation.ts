/**
 * Конфигурация навигации по ролям Bazar.
 *
 * Каждая роль — свой набор вкладок (4–5) и набор разделов
 * за кнопкой «Ещё». Маршруты имеют префикс роли, потому что
 * Expo Router не допускает дублирующихся путей в группах
 * (orders есть у трёх ролей — это разные экраны). Имена каталогов
 * сокращены: customer / store / wholesale / carrier. См. ADR 0003.
 */
import type { LucideIcon } from 'lucide-react-native';
import {
  Banknote,
  BarChart3,
  ClipboardList,
  Ellipsis,
  Heart,
  History,
  Inbox,
  LayoutDashboard,
  Newspaper,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  StickyNote,
  Store,
  Truck,
  User,
  Users,
} from 'lucide-react-native';
import type { Role } from '@bazar/types';

/** Пункт tab bar. */
export interface TabItem {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

/** Раздел за кнопкой «Ещё». */
export interface MoreItem {
  key: string;
  label: string;
  icon: LucideIcon;
  route: string;
}

/** Ключ 'more' открывает шит с moreItems. */
export const MORE_KEY = 'more';

/** Префикс пути роли (имя каталога в (tabs)). */
export const ROLE_PATH: Record<Role, string> = {
  customer: 'customer',
  store_owner: 'store',
  wholesale_seller: 'wholesale',
  carrier: 'carrier',
};

/** Маршрут раздела роли. */
export function routeFor(role: Role, sectionKey: string): string {
  return `/${ROLE_PATH[role]}/${sectionKey}`;
}

/** Первый экран роли — цель редиректа. */
export const FIRST_SECTION: Record<Role, string> = {
  customer: 'catalog',
  store_owner: 'purchase',
  wholesale_seller: 'overview',
  carrier: 'feed',
};

export function firstRouteFor(role: Role): string {
  return routeFor(role, FIRST_SECTION[role]);
}

/** Человеческие названия ролей. */
export const ROLE_LABEL: Record<Role, string> = {
  customer: 'Покупатель',
  store_owner: 'Владелец точки',
  wholesale_seller: 'Оптовик',
  carrier: 'Перевозчик',
};

export interface RoleNavConfig {
  tabs: TabItem[];
  more: MoreItem[];
}

const customerNav: RoleNavConfig = {
  tabs: [
    { key: 'catalog', label: 'Каталог', icon: ShoppingCart },
    { key: 'orders', label: 'Заказы', icon: Package },
    { key: 'deliveries', label: 'Доставки', icon: Truck },
    { key: 'favorites', label: 'Избранное', icon: Heart },
    { key: 'profile', label: 'Профиль', icon: User },
  ],
  more: [],
};

const storeNav: RoleNavConfig = {
  tabs: [
    { key: 'purchase', label: 'Закупка', icon: ShoppingCart },
    { key: 'feed', label: 'Лента', icon: Newspaper },
    { key: 'storefront', label: 'Витрина', icon: Store },
    { key: 'orders', label: 'Заказы', icon: Package },
    { key: MORE_KEY, label: 'Ещё', icon: Ellipsis },
  ],
  more: [
    { key: 'debts', label: 'Долги', icon: ReceiptText, route: '/store/debts' },
    { key: 'notes', label: 'Заметки', icon: StickyNote, route: '/store/notes' },
    {
      key: 'finance',
      label: 'Финансы',
      icon: Banknote,
      route: '/store/finance',
    },
    { key: 'profile', label: 'Профиль', icon: User, route: '/store/profile' },
    {
      key: 'settings',
      label: 'Настройки',
      icon: Settings,
      route: '/store/settings',
    },
  ],
};

const wholesaleNav: RoleNavConfig = {
  tabs: [
    { key: 'overview', label: 'Обзор', icon: LayoutDashboard },
    { key: 'products', label: 'Товары', icon: Package },
    { key: 'orders', label: 'Заказы', icon: ClipboardList },
    { key: 'requests', label: 'Запросы', icon: Inbox },
    { key: MORE_KEY, label: 'Ещё', icon: Ellipsis },
  ],
  more: [
    {
      key: 'clients',
      label: 'Клиенты',
      icon: Users,
      route: '/wholesale/clients',
    },
    {
      key: 'finance',
      label: 'Финансы',
      icon: Banknote,
      route: '/wholesale/finance',
    },
    {
      key: 'analytics',
      label: 'Аналитика',
      icon: BarChart3,
      route: '/wholesale/analytics',
    },
    {
      key: 'profile',
      label: 'Профиль',
      icon: User,
      route: '/wholesale/profile',
    },
    {
      key: 'settings',
      label: 'Настройки',
      icon: Settings,
      route: '/wholesale/settings',
    },
  ],
};

const carrierNav: RoleNavConfig = {
  tabs: [
    { key: 'feed', label: 'Лента', icon: Newspaper },
    { key: 'my-requests', label: 'Заявки', icon: Inbox },
    { key: 'in-transit', label: 'В пути', icon: Truck },
    { key: 'history', label: 'История', icon: History },
    { key: 'profile', label: 'Профиль', icon: User },
  ],
  more: [],
};

export const ROLE_NAV: Record<Role, RoleNavConfig> = {
  customer: customerNav,
  store_owner: storeNav,
  wholesale_seller: wholesaleNav,
  carrier: carrierNav,
};

/** Секции роли в порядке «Ещё» (для шита). */
export function moreItemsFor(role: Role): MoreItem[] {
  return ROLE_NAV[role].more;
}
