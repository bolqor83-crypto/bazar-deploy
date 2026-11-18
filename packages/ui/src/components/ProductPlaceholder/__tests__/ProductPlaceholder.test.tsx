/**
 * Тесты ProductPlaceholder (Промт 16, Часть A).
 *
 * Фон и силуэт из placeholderPalette по теме (light/dark — те же
 * принципы, не инверсия), режимы size: число и 'fill', камера-бейдж
 * только по флагу (кабинет продавца), a11y-подписи.
 */
import { render } from '@testing-library/react-native';
import { useThemeStore } from '../../../theme/themeStore';
import { placeholderPalette } from '../../../icons/silhouettes/palette';
import { ProductPlaceholder } from '../ProductPlaceholder';

/** Hex → упакованный ARGB int (как делает react-native-svg). */
function packedColor(hex: string): number {
  return Number.parseInt(`FF${hex.replace('#', '')}`, 16);
}

type JsonNode = {
  type?: unknown;
  props?: Record<string, unknown>;
  children?: unknown[];
};

function flatten(node: JsonNode | null): JsonNode[] {
  if (!node) {
    return [];
  }
  const childNodes = (node.children ?? []).map((child) =>
    typeof child === 'object' && child !== null ? (child as JsonNode) : null,
  );
  return [node, ...childNodes.flatMap((child) => flatten(child))];
}

function pathFills(screen: Awaited<ReturnType<typeof render>>): number[] {
  return flatten(screen.toJSON() as JsonNode | null)
    .filter((node) => node.type === 'RNSVGPath')
    .map((node) => {
      const value = node.props?.fill;
      if (typeof value === 'object' && value !== null && 'payload' in value) {
        return (value as { payload: number }).payload;
      }
      if (typeof value === 'string') {
        return packedColor(value);
      }
      return value as number;
    });
}

function containerStyle(screen: Awaited<ReturnType<typeof render>>) {
  const node = screen.getByTestId('product-placeholder');
  return Object.assign({}, ...[node.props.style].flat(Infinity)) as Record<
    string,
    unknown
  >;
}

describe('ProductPlaceholder (Промт 16, A)', () => {
  beforeEach(() => {
    useThemeStore.getState().setMode('light');
  });

  afterEach(() => {
    useThemeStore.getState().setMode('light');
  });

  it('светлая тема: фон bgLight, силуэт shapeLight', async () => {
    const screen = await render(
      <ProductPlaceholder silhouette="tomato" size={64} />,
    );
    expect(containerStyle(screen).backgroundColor).toBe(
      placeholderPalette.bgLight,
    );
    for (const fill of pathFills(screen)) {
      expect(fill).toBe(packedColor(placeholderPalette.shapeLight));
    }
  });

  it('тёмная тема: фон bgDark, силуэт shapeDark (не инверсия)', async () => {
    useThemeStore.getState().setMode('dark');
    const screen = await render(
      <ProductPlaceholder silhouette="potato" size={48} />,
    );
    expect(containerStyle(screen).backgroundColor).toBe(
      placeholderPalette.bgDark,
    );
    for (const fill of pathFills(screen)) {
      expect(fill).toBe(packedColor(placeholderPalette.shapeDark));
    }
  });

  it('size-число: контейнер и силуэт ~58% размера', async () => {
    const screen = await render(
      <ProductPlaceholder silhouette="crate" size={100} />,
    );
    const style = containerStyle(screen);
    expect(style.width).toBe(100);
    expect(style.height).toBe(100);
    const svg = flatten(screen.toJSON() as JsonNode | null).find(
      (node) => node.type === 'RNSVGSvgView',
    );
    expect(svg?.props?.width).toBe(58);
    expect(svg?.props?.height).toBe(58);
  });

  it("size='fill': flex-контейнер и силуэт 58% строкой", async () => {
    const screen = await render(
      <ProductPlaceholder silhouette="apple" size="fill" />,
    );
    const style = containerStyle(screen);
    expect(style.flex).toBe(1);
    expect(style.width).toBeUndefined();
    const svg = flatten(screen.toJSON() as JsonNode | null).find(
      (node) => node.type === 'RNSVGSvgView',
    );
    expect(svg?.props?.width).toBe('58%');
    expect(svg?.props?.height).toBe('58%');
  });

  it('камера-бейдж только по флагу — a11y «Нет фото — добавьте»', async () => {
    const withBadge = await render(
      <ProductPlaceholder silhouette="milkBottle" size={48} showCameraBadge />,
    );
    expect(withBadge.getByLabelText('Нет фото — добавьте')).toBeTruthy();
    expect(withBadge.getByTestId('product-placeholder-camera')).toBeTruthy();

    const withoutBadge = await render(
      <ProductPlaceholder silhouette="milkBottle" size={48} />,
    );
    expect(withoutBadge.queryByLabelText('Нет фото — добавьте')).toBeNull();
    expect(withoutBadge.queryByTestId('product-placeholder-camera')).toBeNull();
  });

  it('a11y по умолчанию: «Фото товара отсутствует»', async () => {
    const screen = await render(
      <ProductPlaceholder silhouette="pear" size={48} />,
    );
    expect(screen.getByLabelText('Фото товара отсутствует')).toBeTruthy();
  });

  it('кастомная a11y-подпись переопределяет умолчание', async () => {
    const screen = await render(
      <ProductPlaceholder
        silhouette="grapes"
        size={48}
        accessibilityLabel="Виноград кишмиш, фото отсутствует"
      />,
    );
    expect(
      screen.getByLabelText('Виноград кишмиш, фото отсутствует'),
    ).toBeTruthy();
  });

  it('контраст силуэта к фону — бледный (1.5–2:1), декоративно', () => {
    // Фиксация намерения ADR 0016: заглушка бледнее фото.
    const relative = (hex: string): number => {
      const c = hex.replace('#', '');
      const rgb = [0, 2, 4].map(
        (i) => Number.parseInt(c.slice(i, i + 2), 16) / 255,
      );
      const linear = rgb.map((v) =>
        v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
    };
    const ratio =
      (relative(placeholderPalette.bgLight) + 0.05) /
      (relative(placeholderPalette.shapeLight) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(1.3);
    expect(ratio).toBeLessThanOrEqual(2.1);
  });
});
