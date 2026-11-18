/**
 * Тесты цветных SVG-иконок (Промт 15, Часть A).
 *
 * 16 иконок (6 категорий + 4 роли + 6 инструментов) × 2 размера
 * (24 и 32): рендер без падения, размеры квадрата, заливки —
 * строго из iconPalette (react-native-svg упаковывает цвет
 * в int-пейлоад ARGB), маркер bazarColored различает цветные
 * иконки и Lucide в чипах/строках инструментов.
 */
import { render } from '@testing-library/react-native';
import { ALL_COLORED_ICONS, isColoredIcon, iconPalette } from '../index';

/** Hex палитры → упакованный ARGB int (как делает react-native-svg). */
function packedColor(hex: string): number {
  return Number.parseInt(`FF${hex.replace('#', '')}`, 16);
}

const PALETTE_PACKED = new Set<number>(
  Object.values(iconPalette).map(packedColor),
);

type JsonNode = {
  type?: unknown;
  props?: Record<string, unknown>;
  children?: unknown[];
};

/** Обход дерева toJSON: все узлы. */
function flatten(node: JsonNode | null): JsonNode[] {
  if (!node) {
    return [];
  }
  const childNodes = (node.children ?? []).map((child) =>
    typeof child === 'object' && child !== null ? (child as JsonNode) : null,
  );
  return [node, ...childNodes.flatMap((child) => flatten(child))];
}

/** Корневой узел Svg — тип RNSVGSvgView (нативный мок). */
function rootSvg(tree: JsonNode | null): JsonNode {
  const svg = flatten(tree).find((node) => node.type === 'RNSVGSvgView');
  expect(svg).toBeDefined();
  return svg as unknown as JsonNode;
}

describe('цветные SVG-иконки (Промт 15)', () => {
  it('в наборе ровно 16 иконок с подписями', () => {
    expect(ALL_COLORED_ICONS).toHaveLength(16);
    for (const { label } of ALL_COLORED_ICONS) {
      expect(label.length).toBeGreaterThan(0);
    }
  });

  for (const { icon: Icon, label } of ALL_COLORED_ICONS) {
    describe(`${label} (${Icon.name})`, () => {
      it('рендерится в размере 24', async () => {
        const screen = await render(<Icon size={24} />);
        const svg = rootSvg(screen.toJSON() as JsonNode | null);
        expect(svg.props?.width).toBe(24);
        expect(svg.props?.height).toBe(24);
        expect(svg.props?.vbWidth).toBe(24);
        expect(svg.props?.vbHeight).toBe(24);
      });

      it('рендерится в размере 32', async () => {
        const screen = await render(<Icon size={32} />);
        const svg = rootSvg(screen.toJSON() as JsonNode | null);
        expect(svg.props?.width).toBe(32);
        expect(svg.props?.height).toBe(32);
      });
    });
  }

  it('все заливки и обводки — из iconPalette (никаких currentColor)', async () => {
    for (const { icon: Icon } of ALL_COLORED_ICONS) {
      const screen = await render(<Icon size={24} />);
      const nodes = flatten(screen.toJSON() as JsonNode | null);
      const colors: number[] = [];
      for (const node of nodes) {
        for (const key of ['fill', 'stroke']) {
          const value = node.props?.[key];
          // react-native-svg упаковывает цвет в {type, payload}.
          if (
            typeof value === 'object' &&
            value !== null &&
            'payload' in value
          ) {
            colors.push((value as { payload: number }).payload);
          } else if (typeof value === 'string' && value !== 'none') {
            colors.push(packedColor(value));
          }
        }
      }
      expect(colors.length).toBeGreaterThan(0);
      for (const value of colors) {
        expect(PALETTE_PACKED.has(value)).toBe(true);
      }
    }
  });

  it('каждая иконка маркирована bazarColored (isColoredIcon)', () => {
    for (const { icon } of ALL_COLORED_ICONS) {
      expect(isColoredIcon(icon)).toBe(true);
    }
  });

  it('isColoredIcon отличает Lucide-компонент от цветной иконки', () => {
    const fakeLucide = () => null;
    expect(isColoredIcon(fakeLucide)).toBe(false);
    expect(isColoredIcon(null)).toBe(false);
    expect(isColoredIcon(undefined)).toBe(false);
  });

  it('иконка не зависит от темы: два рендера идентичны', async () => {
    const firstEntry = ALL_COLORED_ICONS[0];
    if (!firstEntry) {
      throw new Error('набор иконок пуст');
    }
    const FirstIcon = firstEntry.icon;
    const first = (await render(<FirstIcon size={24} />)).toJSON() ?? {};
    const second = (await render(<FirstIcon size={24} />)).toJSON() ?? {};
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
