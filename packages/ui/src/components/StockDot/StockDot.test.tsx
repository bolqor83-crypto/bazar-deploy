/**
 * Тесты StockDot — точки наличия (Промт 15, Часть B).
 *
 * Три уровня с правильными цветами токенов, диаметр 12, обводка
 * (белая в light, surface в dark), a11y-подписи.
 */
import { render } from '@testing-library/react-native';
import { colorsDark, colorsLight } from '../../tokens';
import { useThemeStore } from '../../theme/themeStore';
import { StockDot } from './StockDot';

type Screen = Awaited<ReturnType<typeof render>>;

function dotStyleOf(screen: Screen) {
  const json = screen.toJSON();
  const node = (function find(n: unknown): Record<string, unknown> | null {
    if (!n || typeof n !== 'object') {
      return null;
    }
    const record = n as {
      props?: Record<string, unknown>;
      children?: unknown[];
    };
    const style = record.props?.style;
    if (style) {
      const flat = Object.assign(
        {},
        ...([style].flat(Infinity) as Record<string, unknown>[]),
      );
      if (
        typeof flat.borderRadius === 'number' &&
        typeof flat.borderWidth === 'number'
      ) {
        return flat;
      }
    }
    for (const child of record.children ?? []) {
      const found = find(child);
      if (found) {
        return found;
      }
    }
    return null;
  })(json);
  expect(node).not.toBeNull();
  return node as Record<string, unknown>;
}

describe('StockDot (Промт 15)', () => {
  beforeEach(() => {
    useThemeStore.getState().setMode('light');
  });

  it('in — зелёная (success)', async () => {
    const screen = await render(<StockDot level="in" />);
    expect(dotStyleOf(screen).backgroundColor).toBe(colorsLight.success);
  });

  it('low — янтарная (accent)', async () => {
    const screen = await render(<StockDot level="low" />);
    expect(dotStyleOf(screen).backgroundColor).toBe(colorsLight.accent);
  });

  it('out — серая (textMuted)', async () => {
    const screen = await render(<StockDot level="out" />);
    expect(dotStyleOf(screen).backgroundColor).toBe(colorsLight.textMuted);
  });

  it('диаметр 12, скругление 6, обводка 2 белая в light', async () => {
    const screen = await render(<StockDot level="in" />);
    const style = dotStyleOf(screen);
    expect(style.width).toBe(12);
    expect(style.height).toBe(12);
    expect(style.borderRadius).toBe(6);
    expect(style.borderWidth).toBe(2);
    expect(style.borderColor).toBe('#FFFFFF');
  });

  it('в dark-теме обводка — surface, не чисто белый', async () => {
    useThemeStore.getState().setMode('dark');
    const screen = await render(<StockDot level="in" />);
    expect(dotStyleOf(screen).borderColor).toBe(colorsDark.surface);
    useThemeStore.getState().setMode('light');
  });

  it('a11y-подписи уровней', async () => {
    for (const [level, label] of [
      ['in', 'Наличие: В наличии'],
      ['low', 'Наличие: Мало осталось'],
      ['out', 'Наличие: Нет в наличии'],
    ] as const) {
      const screen = await render(<StockDot level={level} />);
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('кастомный размер масштабируется', async () => {
    const screen = await render(<StockDot level="in" size={16} />);
    const style = dotStyleOf(screen);
    expect(style.width).toBe(16);
    expect(style.borderRadius).toBe(8);
  });
});
