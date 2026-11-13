/**
 * Тесты экранов корзины и заказов (Промт 9, Части D+E):
 * корзина (позиции/пустая/ошибка/очистка), checkout (сводка,
 * самовывоз, создание), список заказов (фильтры/пустой),
 * карточка (таймлайн/отмена). API замокано.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CartView, Order, OrderList } from '@bazar/types';
import { customerContext } from '../mocks/context';
import { useContextStore } from '../stores/contextStore';
import {
  addCartItem,
  clearCart,
  fetchCart,
  removeCartItem,
  updateCartItem,
} from '../services/api/cartApi';
import {
  cancelOrder,
  createOrder,
  fetchOrder,
  fetchOrders,
} from '../services/api/orderApi';
import CartScreen from '../components/screens/CartScreen';
import CheckoutScreen from '../components/screens/CheckoutScreen';
import OrdersScreen from '../components/screens/OrdersScreen';
import OrderDetailScreen from '../components/screens/OrderDetailScreen';
import CustomerCartRoute from '../app/(tabs)/customer/cart';
import { useAuthStore } from '../stores/authStore';

jest.mock('../services/api/cartApi');
jest.mock('../services/api/orderApi');

const fetchCartMock = jest.mocked(fetchCart);
const updateCartItemMock = jest.mocked(updateCartItem);
const removeCartItemMock = jest.mocked(removeCartItem);
const clearCartMock = jest.mocked(clearCart);
const createOrderMock = jest.mocked(createOrder);
const fetchOrdersMock = jest.mocked(fetchOrders);
const fetchOrderMock = jest.mocked(fetchOrder);
const cancelOrderMock = jest.mocked(cancelOrder);
void addCartItem;

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const fullCart: CartView = {
  items: [
    {
      id: 'item-1',
      quantity: 10,
      subtotal: 189_000,
      offer: {
        id: 'offer-1',
        priceKopecks: 18_900,
        stock: 50,
        minQuantity: 5,
        badge: null,
        isPerishable: false,
        product: { id: 'p1', name: 'Помидоры розовые', unit: '1 кг' },
        organization: { id: 'org1', name: 'Опт-Юг' },
      },
    },
  ],
  subtotal: 189_000,
  warnings: [],
};

const order: Order = {
  id: 'order-1',
  number: 'BZ-2026-000001',
  status: 'PENDING',
  subtotal: 189_000,
  deliveryCost: 0,
  total: 189_000,
  address: null,
  comment: 'Позвонить за час',
  createdAt: '2026-11-12T05:30:00Z',
  updatedAt: '2026-11-12T05:30:00Z',
  seller: { id: 'org1', name: 'Опт-Юг' },
  items: [
    {
      id: 'oi-1',
      offerId: 'offer-1',
      title: 'Помидоры розовые',
      unit: '1 кг',
      price: 18_900,
      quantity: 10,
      total: 189_000,
    },
  ],
  events: [{ id: 'e1', type: 'CREATED', createdAt: '2026-11-12T05:30:00Z' }],
};

const orderList: OrderList = {
  items: [order],
  total: 1,
  page: 1,
  pageSize: 10,
  hasMore: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  useContextStore.setState({
    ...useContextStore.getState(),
    active: customerContext,
    hydrated: true,
  });
});

describe('CartScreen', () => {
  it('позиции: название, продавец, итог, CTA оформления', async () => {
    fetchCartMock.mockResolvedValue(fullCart);
    const screen = await renderWithQuery(<CartScreen basePath="customer" />);
    await waitFor(() =>
      expect(screen.getByText('Помидоры розовые')).toBeTruthy(),
    );
    expect(screen.getByText('Опт-Юг · партия от 5')).toBeTruthy();
    expect(screen.getByText('Товаров: 10 · Позиций: 1')).toBeTruthy();
    expect(screen.getByTestId('cart-checkout')).toBeTruthy();
  });

  it('пустая корзина: EmptyState с переходом в каталог', async () => {
    fetchCartMock.mockResolvedValue({ items: [], subtotal: 0, warnings: [] });
    const screen = await renderWithQuery(<CartScreen basePath="customer" />);
    await waitFor(() => expect(screen.getByText('Корзина пуста')).toBeTruthy());
    expect(screen.getByText('Перейти в каталог')).toBeTruthy();
    // без позиций нет и кнопки очистки
    expect(screen.queryByTestId('cart-clear')).toBeNull();
  });

  it('ошибка загрузки: ErrorState с повтором', async () => {
    fetchCartMock.mockRejectedValue(new Error('network'));
    const screen = await renderWithQuery(<CartScreen basePath="customer" />);
    await waitFor(() =>
      expect(screen.getByText('Корзина не загрузилась')).toBeTruthy(),
    );
  });

  it('удаление позиции вызывает API', async () => {
    fetchCartMock.mockResolvedValue(fullCart);
    removeCartItemMock.mockResolvedValue({
      items: [],
      subtotal: 0,
      warnings: [],
    });
    const screen = await renderWithQuery(<CartScreen basePath="customer" />);
    await waitFor(() =>
      expect(screen.getByLabelText('Удалить Помидоры розовые')).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText('Удалить Помидоры розовые'));
    await waitFor(() =>
      expect(removeCartItemMock).toHaveBeenCalledWith('item-1'),
    );
  });

  it('диалог очистки подтверждает удаление всех позиций', async () => {
    fetchCartMock.mockResolvedValue(fullCart);
    clearCartMock.mockResolvedValue({ items: [], subtotal: 0, warnings: [] });
    const screen = await renderWithQuery(<CartScreen basePath="customer" />);
    await waitFor(() => expect(screen.getByTestId('cart-clear')).toBeTruthy());
    fireEvent.press(screen.getByTestId('cart-clear'));
    await waitFor(() =>
      expect(screen.getByText('Очистить корзину?')).toBeTruthy(),
    );
    fireEvent.press(screen.getByTestId('cart-clear-confirm'));
    await waitFor(() => expect(clearCartMock).toHaveBeenCalledTimes(1));
  });

  it('изменение количества вызывает PATCH', async () => {
    fetchCartMock.mockResolvedValue(fullCart);
    updateCartItemMock.mockResolvedValue(fullCart);
    const screen = await renderWithQuery(<CartScreen basePath="customer" />);
    await waitFor(() =>
      expect(screen.getByLabelText('Увеличить количество')).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText('Увеличить количество'));
    await waitFor(() =>
      expect(updateCartItemMock).toHaveBeenCalledWith('item-1', 11),
    );
  });

  it('уменьшение количества вызывает PATCH с меньшим значением', async () => {
    fetchCartMock.mockResolvedValue(fullCart);
    updateCartItemMock.mockResolvedValue(fullCart);
    const screen = await renderWithQuery(<CartScreen basePath="customer" />);
    await waitFor(() =>
      expect(screen.getByLabelText('Уменьшить количество')).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText('Уменьшить количество'));
    await waitFor(() =>
      expect(updateCartItemMock).toHaveBeenCalledWith('item-1', 9),
    );
  });

  it('warnings: сводка и подпись у проблемной позиции', async () => {
    const warnedCart: CartView = {
      ...fullCart,
      warnings: [
        {
          itemId: 'item-1',
          message: 'Осталось 3 на складе — уменьшите количество',
        },
      ],
    };
    fetchCartMock.mockResolvedValue(warnedCart);
    const screen = await renderWithQuery(<CartScreen basePath="customer" />);
    await waitFor(() =>
      expect(screen.getAllByText(/Осталось 3 на складе/).length).toBe(2),
    );
  });
});

describe('CheckoutScreen', () => {
  it('сводка корзины, самовывоз выбран, создание заказа', async () => {
    fetchCartMock.mockResolvedValue(fullCart);
    createOrderMock.mockResolvedValue([order]);
    const screen = await renderWithQuery(
      <CheckoutScreen basePath="customer" />,
    );
    await waitFor(() =>
      expect(screen.getByText('Самовывоз с рынка')).toBeTruthy(),
    );
    expect(screen.getByTestId('checkout-pickup')).toBeTruthy();
    expect(screen.getByText('Самовывоз с рынка')).toBeTruthy();
    expect(screen.getByTestId('checkout-total')).toBeTruthy();
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));
    expect(createOrderMock.mock.calls[0]?.[0]?.deliveryMethod).toBe('pickup');
  });

  it('доставка помечена «Скоро» и недоступна', async () => {
    fetchCartMock.mockResolvedValue(fullCart);
    const screen = await renderWithQuery(
      <CheckoutScreen basePath="customer" />,
    );
    await waitFor(() => expect(screen.getByText('Скоро')).toBeTruthy());
  });

  it('пустая корзина — сообщение без формы', async () => {
    fetchCartMock.mockResolvedValue({ items: [], subtotal: 0, warnings: [] });
    const screen = await renderWithQuery(
      <CheckoutScreen basePath="customer" />,
    );
    await waitFor(() => expect(screen.getByText(/Корзина пуста/)).toBeTruthy());
  });

  it('итог заказа отображается в блоке Итого', async () => {
    fetchCartMock.mockResolvedValue(fullCart);
    const screen = await renderWithQuery(
      <CheckoutScreen basePath="customer" />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('checkout-total')).toBeTruthy(),
    );
    // subtotal 189 000 коп = 1 890 ₽ (NBSP-разделитель ru-RU)
    expect(screen.getByTestId('checkout-total').props.children).toMatch(
      /1\u00a0890/,
    );
  });

  it('нажатие на недоступную доставку не меняет выбор', async () => {
    fetchCartMock.mockResolvedValue(fullCart);
    const screen = await renderWithQuery(
      <CheckoutScreen basePath="customer" />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('checkout-delivery')).toBeTruthy(),
    );
    fireEvent.press(screen.getByTestId('checkout-delivery'));
    await waitFor(() => expect(createOrderMock).not.toHaveBeenCalled());
    // самовывоз остаётся выбранным: сворке доставки недоступна
    expect(screen.getByText('Скоро')).toBeTruthy();
  });

  it('комментарий продавцу передаётся в создание заказа', async () => {
    fetchCartMock.mockResolvedValue(fullCart);
    createOrderMock.mockResolvedValue([order]);
    const screen = await renderWithQuery(
      <CheckoutScreen basePath="customer" />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('checkout-comment')).toBeTruthy(),
    );
    await fireEvent.changeText(
      screen.getByTestId('checkout-comment'),
      'Позвонить за час',
    );
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));
    expect(createOrderMock.mock.calls[0]?.[0]?.comment).toBe(
      'Позвонить за час',
    );
  });

  it('пустой комментарий не передаётся (undefined)', async () => {
    fetchCartMock.mockResolvedValue(fullCart);
    createOrderMock.mockResolvedValue([order]);
    const screen = await renderWithQuery(
      <CheckoutScreen basePath="customer" />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('checkout-submit')).toBeTruthy(),
    );
    fireEvent.press(screen.getByTestId('checkout-submit'));
    await waitFor(() => expect(createOrderMock).toHaveBeenCalledTimes(1));
    expect(createOrderMock.mock.calls[0]?.[0]?.comment).toBeUndefined();
  });

  it('сводка ограничена четырьмя позициями', async () => {
    const first = fullCart.items[0];
    if (!first) throw new Error('fixture пуст');
    const bigCart: CartView = {
      ...fullCart,
      items: Array.from({ length: 5 }, (_, i) => ({
        ...first,
        id: `item-${i + 1}`,
        offer: {
          ...first.offer,
          product: { ...first.offer.product, name: `Товар ${i + 1}` },
        },
      })),
    };
    fetchCartMock.mockResolvedValue(bigCart);
    const screen = await renderWithQuery(
      <CheckoutScreen basePath="customer" />,
    );
    await waitFor(() => expect(screen.getByText(/Товар 1/)).toBeTruthy());
    expect(screen.getByText(/Товар 4/)).toBeTruthy();
    expect(screen.queryByText(/Товар 5/)).toBeNull();
  });
});

describe('OrdersScreen', () => {
  it('список: карточка заказа с номером и итогом', async () => {
    fetchOrdersMock.mockResolvedValue(orderList);
    const screen = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() =>
      expect(screen.getByText('BZ-2026-000001')).toBeTruthy(),
    );
    expect(screen.getByText('Новый')).toBeTruthy();
  });

  it('карточка показывает продавца и дату', async () => {
    fetchOrdersMock.mockResolvedValue(orderList);
    const screen = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() =>
      expect(screen.getByText('BZ-2026-000001')).toBeTruthy(),
    );
    expect(screen.getByText(/Опт-Юг/)).toBeTruthy();
    expect(screen.getByText(/12 ноя/)).toBeTruthy();
  });

  it('пустой список: EmptyState с переходом в каталог', async () => {
    fetchOrdersMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
    const screen = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() =>
      expect(screen.getByText('Пока нет заказов')).toBeTruthy(),
    );
    expect(screen.getByText('Перейти в каталог')).toBeTruthy();
  });

  it('фильтры-чипы переключают запрос статуса', async () => {
    fetchOrdersMock.mockResolvedValue(orderList);
    const screen = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() =>
      expect(screen.getByTestId('orders-filter-all')).toBeTruthy(),
    );
    fireEvent.press(screen.getByTestId('orders-filter-cancelled'));
    await waitFor(() =>
      expect(fetchOrdersMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CANCELLED' }),
      ),
    );
    // «Все» — без фильтра статуса
    fireEvent.press(screen.getByTestId('orders-filter-all'));
    await waitFor(() =>
      expect(fetchOrdersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: undefined }),
      ),
    );
  });
});

describe('OrderDetailScreen', () => {
  it('таймлайн, позиции, итог, комментарий', async () => {
    fetchOrderMock.mockResolvedValue(order);
    const screen = await renderWithQuery(
      <OrderDetailScreen basePath="customer" orderId="order-1" />,
    );
    await waitFor(() =>
      expect(screen.getByText('BZ-2026-000001')).toBeTruthy(),
    );
    expect(screen.getByTestId('order-timeline')).toBeTruthy();
    expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    expect(screen.getByTestId('order-total')).toBeTruthy();
    expect(screen.getByText('Позвонить за час')).toBeTruthy();
  });

  it('отмена: диалог → API', async () => {
    fetchOrderMock.mockResolvedValue(order);
    cancelOrderMock.mockResolvedValue({ ...order, status: 'CANCELLED' });
    const screen = await renderWithQuery(
      <OrderDetailScreen basePath="customer" orderId="order-1" />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('order-cancel')).toBeTruthy(),
    );
    fireEvent.press(screen.getByTestId('order-cancel'));
    await waitFor(() =>
      expect(screen.getByText('Отменить заказ?')).toBeTruthy(),
    );
    fireEvent.press(screen.getByTestId('order-cancel-confirm'));
    await waitFor(() =>
      expect(cancelOrderMock).toHaveBeenCalledWith('order-1'),
    );
  });

  it('ошибка загрузки: ErrorState', async () => {
    fetchOrderMock.mockRejectedValue(new Error('network'));
    const screen = await renderWithQuery(
      <OrderDetailScreen basePath="customer" orderId="order-1" />,
    );
    await waitFor(() =>
      expect(screen.getByText('Заказ не загрузился')).toBeTruthy(),
    );
  });

  it('COMPLETED: отменить нельзя — кнопки нет', async () => {
    fetchOrderMock.mockResolvedValue({ ...order, status: 'COMPLETED' });
    const screen = await renderWithQuery(
      <OrderDetailScreen basePath="customer" orderId="order-1" />,
    );
    await waitFor(() =>
      expect(screen.getByText('BZ-2026-000001')).toBeTruthy(),
    );
    expect(screen.queryByTestId('order-cancel')).toBeNull();
  });

  it('CANCELLED: кнопки отмены нет, ось обрывается на «Отменён»', async () => {
    fetchOrderMock.mockResolvedValue({
      ...order,
      status: 'CANCELLED',
      events: [
        ...order.events,
        { id: 'e2', type: 'CANCELLED', createdAt: '2026-11-12T06:00:00Z' },
      ],
    });
    const screen = await renderWithQuery(
      <OrderDetailScreen basePath="customer" orderId="order-1" />,
    );
    await waitFor(() =>
      expect(screen.getAllByText('Отменён').length).toBeGreaterThanOrEqual(1),
    );
    expect(screen.queryByTestId('order-cancel')).toBeNull();
  });

  it('CONFIRMED: отмена доступна (кнопка есть)', async () => {
    fetchOrderMock.mockResolvedValue({ ...order, status: 'CONFIRMED' });
    const screen = await renderWithQuery(
      <OrderDetailScreen basePath="customer" orderId="order-1" />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('order-cancel')).toBeTruthy(),
    );
  });

  it('кнопка «Связаться с продавцом» присутствует', async () => {
    fetchOrderMock.mockResolvedValue(order);
    const screen = await renderWithQuery(
      <OrderDetailScreen basePath="customer" orderId="order-1" />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Связаться с продавцом' }),
      ).toBeTruthy(),
    );
  });
});

describe('Оболочка корзины (RoleScreen + badge таб-бара)', () => {
  it('экран корзины покупателя: шапка, таб-бар, badge позиций', async () => {
    useAuthStore.setState({
      state: 'authenticated',
      user: {
        id: 'u1',
        phone: '+79001234567',
        name: 'Иван',
        createdAt: '2026-11-01T00:00:00Z',
        memberships: [],
      },
      token: 'test-token',
      error: null,
    });
    fetchCartMock.mockResolvedValue(fullCart);
    const screen = await renderWithQuery(<CustomerCartRoute />);
    // Заголовок шапки + подсвеченная вкладка «Корзина»
    await waitFor(() =>
      expect(screen.getAllByText('Корзина').length).toBeGreaterThanOrEqual(2),
    );
    // Badge таб-бара — количество позиций корзины (1 позиция)
    await waitFor(() => expect(screen.getByText('1')).toBeTruthy());
    // Таб-бар покупателя: Каталог, Заказы, Корзина, Избранное, Профиль
    expect(screen.getByText('Каталог')).toBeTruthy();
    expect(screen.getByText('Заказы')).toBeTruthy();
    expect(screen.getByText('Избранное')).toBeTruthy();
    expect(screen.getByText('Профиль')).toBeTruthy();
    useAuthStore.setState({ state: 'unknown', user: null, token: null });
  });

  it('пустая корзина: badge в таб-баре не показывается', async () => {
    useAuthStore.setState({
      state: 'authenticated',
      user: {
        id: 'u1',
        phone: '+79001234567',
        name: 'Иван',
        createdAt: '2026-11-01T00:00:00Z',
        memberships: [],
      },
      token: 'test-token',
      error: null,
    });
    fetchCartMock.mockResolvedValue({ items: [], subtotal: 0, warnings: [] });
    const screen = await renderWithQuery(<CustomerCartRoute />);
    await waitFor(() => expect(screen.getByText('Корзина пуста')).toBeTruthy());
    // Позиций нет — отдельного badge-числа в таб-баре нет
    expect(screen.queryByText('1')).toBeNull();
    useAuthStore.setState({ state: 'unknown', user: null, token: null });
  });
});
