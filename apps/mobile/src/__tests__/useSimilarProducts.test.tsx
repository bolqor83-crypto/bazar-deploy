/**
 * Тесты useSimilarProducts (Промт 14a): ключ ['similar', id],
 * смена id → новый запрос, undefined → запрос не уходит.
 *
 * RNTL-версия проекта не отдаёт renderHook — хук проверяется
 * рендером мостика-компонента (тот же паттерн, что и экраны).
 */
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { CatalogSimilarProducts } from '@bazar/types';
import { useSimilarProducts } from '../hooks/useSimilarProducts';
import { fetchSimilarProducts } from '../services/api/catalogApi';

jest.mock('../services/api/catalogApi', () => ({
  fetchSimilarProducts: jest.fn(),
}));

const fetchSimilarMock = jest.mocked(fetchSimilarProducts);

const SIMILAR: CatalogSimilarProducts = {
  items: [
    {
      id: 'p2',
      name: 'Огурцы гладкие',
      unit: '1 кг',
      description: 'Гладкие огурцы.',
      category: { slug: 'vegetables', name: 'Овощи' },
      images: [],
      bestOffer: null,
      offersCount: 1,
    },
  ],
};

/** Мостик: рендерит хук и показывает его состояние текстом. */
function SimilarProbe({ id }: { id: string | undefined }) {
  const query = useSimilarProducts(id);
  const label = query.isPending
    ? 'pending'
    : query.data
      ? `loaded:${query.data.items.length}`
      : 'other';
  return (
    <View>
      <Text testID="probe">{label}</Text>
    </View>
  );
}

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchSimilarMock.mockResolvedValue(SIMILAR);
});

describe('useSimilarProducts', () => {
  it('запрашивает похожие для переданного id', async () => {
    const screen = await renderWithQuery(<SimilarProbe id="p1" />);
    await waitFor(() => {
      expect(screen.getByTestId('probe').props.children).toBe('loaded:1');
    });
    expect(fetchSimilarMock).toHaveBeenCalledWith('p1', 10);
  });

  it('смена productId → новый запрос (queryKey меняется)', async () => {
    const screen = await renderWithQuery(<SimilarProbe id="p1" />);
    await waitFor(() => {
      expect(screen.getByTestId('probe').props.children).toBe('loaded:1');
    });
    // Другой id в новом рендере — запрос уходит заново.
    const second = await renderWithQuery(<SimilarProbe id="p2" />);
    await waitFor(() => {
      expect(second.getByTestId('probe').props.children).toBe('loaded:1');
    });
    expect(fetchSimilarMock).toHaveBeenCalledWith('p2', 10);
    expect(fetchSimilarMock).toHaveBeenCalledTimes(2);
  });

  it('undefined — запрос не уходит (enabled)', async () => {
    const screen = await renderWithQuery(<SimilarProbe id={undefined} />);
    await waitFor(() => {
      expect(screen.getByTestId('probe').props.children).toBe('pending');
    });
    expect(fetchSimilarMock).not.toHaveBeenCalled();
  });
});
