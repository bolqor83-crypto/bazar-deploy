/**
 * Конфигурация навигации по ролям Bazar.
 *
 * Каждая роль — свой набор вкладок (4–5). Пункт «Инструменты» ведёт
 * на полноэкранный экран «Все инструменты» (Промт 12, Часть D) с
 * группами разделов и поиском — вместо шита с плоским списком.
 * Маршруты имеют префикс роли, потому что Expo Router не допускает
 * дублирующихся путей в группах (orders есть у трёх ролей — это
 * разные экраны). Имена каталогов сокращены: customer / store /
 * wholesale / carrier. См. ADR 0003.
 */
import type { LucideIcon } from 'lucide-react-native';
import {
  Banknote,
  BarChart3,
  Bell,
  ClipboardList,
  Heart,
  History,
  Inbox,
  Layers,
  LayoutDashboard,
  LayoutGrid,
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
  Warehouse,
} from 'lucide-react-native';
import type { Role } from '@bazar/types';

/** Пункт tab bar. */
export interface TabItem {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

/** Раздел экрана «Все инструменты». */
export interface MoreItem {
  key: string;
  label: string;
  icon: LucideIcon;
  route: string;
  /** Ключ данных для бейджа (например, непрочитанные уведомления). */
  badgeKind?: 'notifications';
}

/** Группа разделов «Все инструменты». */
export interface MoreGroup {
  title: string;
  items: MoreItem[];
}

/** Ключ 'more' открывает экран «Все инструменты». */
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
  /** Группы разделов экрана «Все инструменты». */
  more: MoreGroup[];
}

const customerNav: RoleNavConfig = {
  tabs: [
    { key: 'catalog', label: 'Каталог', icon: LayoutGrid },
    { key: 'orders', label: 'Заказы', icon: Package },
    // Промт 9, Часть D: корзина с badge количества позиций.
    { key: 'cart', label: 'Корзина', icon: ShoppingCart },
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
    // Промт 12, Часть D: «Ещё» → «Инструменты» (полноэкранный экран).
    { key: MORE_KEY, label: 'Инструменты', icon: LayoutGrid },
  ],
  more: [
    {
      title: 'Торговля',
      items: [
        {
          key: 'purchase',
          label: 'Закупка',
          icon: ShoppingCart,
          route: '/store/purchase',
        },
        { key: 'feed', label: 'Лента', icon: Newspaper, route: '/store/feed' },
        {
          key: 'storefront',
          label: 'Витрина',
          icon: Store,
          route: '/store/storefront',
        },
        {
          key: 'orders',
          label: 'Заказы',
          icon: Package,
          route: '/store/orders',
        },
      ],
    },
    {
      title: 'Финансы',
      items: [
        // Заглушки — функциональность Промта 13+.
        {
          key: 'debts',
          label: 'Долги',
          icon: ReceiptText,
          route: '/store/debts',
        },
        {
          key: 'finance',
          label: 'Финансы',
          icon: Banknote,
          route: '/store/finance',
        },
      ],
    },
    {
      title: 'Рабочие записи',
      items: [
        {
          key: 'notes',
          label: 'Заметки',
          icon: StickyNote,
          route: '/store/notes',
        },
      ],
    },
    {
      title: 'Аккаунт',
      items: [
        {
          key: 'profile',
          label: 'Профиль',
          icon: User,
          route: '/store/profile',
        },
        {
          key: 'settings',
          label: 'Настройки',
          icon: Settings,
          route: '/store/settings',
        },
      ],
    },
  ],
};

const wholesaleNav: RoleNavConfig = {
  tabs: [
    { key: 'overview', label: 'Обзор', icon: LayoutDashboard },
    { key: 'products', label: 'Товары', icon: Package },
    { key: 'orders', label: 'Заказы', icon: ClipboardList },
    { key: 'offers', label: 'Предложения', icon: Layers },
    // Промт 12, Часть D: «Ещё» → «Инструменты» (полноэкранный экран).
    { key: MORE_KEY, label: 'Инструменты', icon: LayoutGrid },
  ],
  more: [
    {
      title: 'Торговля',
      items: [
        {
          key: 'products',
          label: 'Товары',
          icon: Package,
          route: '/wholesale/products',
        },
        {
          key: 'offers',
          label: 'Предложения',
          icon: Layers,
          route: '/wholesale/offers',
        },
        {
          key: 'orders',
          label: 'Заказы',
          icon: ClipboardList,
          route: '/wholesale/orders',
        },
        {
          key: 'requests',
          label: 'Запросы',
          icon: Inbox,
          route: '/wholesale/requests',
        },
      ],
    },
    {
      title: 'Склад',
      items: [
        // Склад — рабочий инструмент продавца (ADR 0012).
        {
          key: 'stock',
          label: 'Склад',
          icon: Warehouse,
          route: '/wholesale/stock',
        },
        {
          key: 'stock-locations',
          label: 'Склады',
          icon: Warehouse,
          route: '/wholesale/stock/locations',
        },
        {
          key: 'movements',
          label: 'Движения',
          icon: History,
          route: '/wholesale/movements',
        },
      ],
    },
    {
      title: 'Клиенты',
      items: [
        {
          key: 'clients',
          label: 'Клиенты',
          icon: Users,
          route: '/wholesale/clients',
        },
        // Заглушка — функциональность Промта 13+.
        {
          key: 'notes',
          label: 'Заметки',
          icon: StickyNote,
          route: '/wholesale/notes',
        },
      ],
    },
    {
      title: 'Финансы',
      items: [
        // Заглушки — функциональность Промта 13+.
        {
          key: 'debts',
          label: 'Долги',
          icon: ReceiptText,
          route: '/wholesale/debts',
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
      ],
    },
    {
      title: 'Аккаунт',
      items: [
        // Заглушки — функциональность Промта 13+.
        {
          key: 'organization',
          label: 'Организация',
          icon: Store,
          route: '/wholesale/organization',
        },
        {
          key: 'staff',
          label: 'Сотрудники',
          icon: Users,
          route: '/wholesale/staff',
        },
        {
          key: 'notifications',
          label: 'Уведомления',
          icon: Bell,
          route: '/wholesale/notifications',
          badgeKind: 'notifications',
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
    },
  ],
};

const carrierNav: RoleNavConfig = {
  // Промт 10, Часть D: рабочие экраны перевозчика — лента заявок,
  // мои доставки (активные/история), история рейсов с заработком.
  tabs: [
    { key: 'feed', label: 'Лента', icon: Newspaper },
    { key: 'my-deliveries', label: 'Мои доставки', icon: Truck },
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

/** Группы «Все инструменты» роли. */
export function moreGroupsFor(role: Role): MoreGroup[] {
  return ROLE_NAV[role].more;
}
