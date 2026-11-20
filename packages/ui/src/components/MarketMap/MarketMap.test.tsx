/**
 * Тесты MarketMap — схемы рынка (Промт 17, Часть B).
 *
 * Ряды-полосы, точки с номерами, пунктир обратной ветки,
 * visited-чеки, обводка следующей непройденной, a11y-подпись.
 */
import { render } from '@testing-library/react-native';
import { MarketMap, type MarketMapStop } from './MarketMap';

const ENTRANCE = { row: 0, spot: 0 };

function stops(pairs: [number, number, boolean][]): MarketMapStop[] {
  return pairs.map(([row, spot, visited], i) => ({
    row,
    spot,
    index: i + 1,
    visited,
  }));
}

describe('MarketMap', () => {
  it('рисует полосы всех рядов с подписями', async () => {
    const screen = await render(
      <MarketMap
        rows={4}
        spots={40}
        entrance={ENTRANCE}
        stops={stops([[1, 8, false]])}
        returnToStart={false}
      />,
    );
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('Ряд 1');
    expect(json).toContain('Ряд 4');
  });

  it('номера остановок на точках маршрута', async () => {
    const screen = await render(
      <MarketMap
        rows={4}
        spots={40}
        entrance={ENTRANCE}
        stops={stops([
          [1, 8, false],
          [2, 27, false],
          [3, 12, false],
        ])}
        returnToStart={false}
      />,
    );
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"1"');
    expect(json).toContain('"2"');
    expect(json).toContain('"3"');
  });

  it('a11y: role image и итоговая подпись', async () => {
    const screen = await render(
      <MarketMap
        rows={4}
        spots={40}
        entrance={ENTRANCE}
        stops={stops([[1, 8, false]])}
        returnToStart={false}
        a11yLabel="Схема рынка: 3 точки, 640 метров"
      />,
    );
    const root = screen.root;
    expect(root?.props.accessibilityRole).toBe('image');
    expect(root?.props.accessibilityLabel).toBe(
      'Схема рынка: 3 точки, 640 метров',
    );
  });

  it('маркер входа с подписью', async () => {
    const screen = await render(
      <MarketMap
        rows={4}
        spots={40}
        entrance={ENTRANCE}
        stops={[]}
        returnToStart={false}
      />,
    );
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('Вход');
  });

  it('подсказка схемы упоминает количество мест', async () => {
    const screen = await render(
      <MarketMap
        rows={4}
        spots={40}
        entrance={ENTRANCE}
        stops={[]}
        returnToStart={false}
      />,
    );
    expect(screen.getByText(/40 мест в ряду/)).toBeTruthy();
  });
});
