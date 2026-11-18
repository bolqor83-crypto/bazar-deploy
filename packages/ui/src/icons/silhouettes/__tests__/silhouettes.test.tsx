/**
 * Тесты силуэтов продукции (Промт 16, Часть A).
 *
 * 24 силуэта: рендер без падения, квадрат с переданным размером,
 * viewBox 0 0 24 24, не более двух Path, заливка — переданный цвет
 * или светлый тон палитры заглушек (react-native-svg упаковывает
 * цвет в int-пейлоад ARGB). Полнота карты SILHOUETTES и подписей.
 */
import { render } from '@testing-library/react-native';
import {
  SILHOUETTES,
  SILHOUETTE_LABELS,
  placeholderPalette,
  type SilhouetteKey,
} from '../index';

/** Hex → упакованный ARGB int (как делает react-native-svg). */
function packedColor(hex: string): number {
  return Number.parseInt(`FF${hex.replace('#', '')}`, 16);
}

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

function rootSvg(tree: JsonNode | null): JsonNode {
  const svg = flatten(tree).find((node) => node.type === 'RNSVGSvgView');
  expect(svg).toBeDefined();
  return svg as unknown as JsonNode;
}

/** Path-узлы силуэта. */
function pathsOf(tree: JsonNode | null): JsonNode[] {
  return flatten(tree).filter((node) => node.type === 'RNSVGPath');
}

/** Цвет из пропа: {type, payload} (нативный мок) | string | number. */
function unpackColor(value: unknown): number {
  if (typeof value === 'object' && value !== null && 'payload' in value) {
    return (value as { payload: number }).payload;
  }
  if (typeof value === 'string') {
    return packedColor(value);
  }
  return value as number;
}

const KEYS = Object.keys(SILHOUETTES) as SilhouetteKey[];

describe('силуэты продукции (Промт 16, Часть A)', () => {
  it('в карте ровно 24 силуэта с уникальными ключами', () => {
    expect(KEYS).toHaveLength(24);
    expect(new Set(KEYS).size).toBe(24);
  });

  it('подписи покрывают все 24 ключа без повторов', () => {
    expect(SILHOUETTE_LABELS).toHaveLength(24);
    const labelKeys = SILHOUETTE_LABELS.map((entry) => entry.key);
    expect(new Set(labelKeys).size).toBe(24);
    for (const key of KEYS) {
      expect(labelKeys).toContain(key);
    }
    for (const { label } of SILHOUETTE_LABELS) {
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('crate — универсальный fallback присутствует', () => {
    expect(SILHOUETTES.crate).toBeDefined();
  });

  for (const key of KEYS) {
    const Icon = SILHOUETTES[key];
    describe(`${key} (${Icon.name})`, () => {
      it('рендерится в размере 24 с viewBox 24 и заливкой по умолчанию', async () => {
        const screen = await render(<Icon size={24} />);
        const svg = rootSvg(screen.toJSON() as JsonNode | null);
        expect(svg.props?.width).toBe(24);
        expect(svg.props?.height).toBe(24);
        // viewBox сериализуется как vbWidth/vbHeight (нативный мок).
        expect(svg.props?.vbWidth).toBe(24);
        expect(svg.props?.vbHeight).toBe(24);
        const paths = pathsOf(screen.toJSON() as JsonNode | null);
        expect(paths.length).toBeGreaterThanOrEqual(1);
        expect(paths.length).toBeLessThanOrEqual(2);
        for (const path of paths) {
          expect(unpackColor(path.props?.fill)).toBe(
            packedColor(placeholderPalette.shapeLight),
          );
        }
      });

      it('переданный цвет переопределяет заливку (тёмная тема)', async () => {
        const screen = await render(
          <Icon size={48} color={placeholderPalette.shapeDark} />,
        );
        const svg = rootSvg(screen.toJSON() as JsonNode | null);
        expect(svg.props?.width).toBe(48);
        const paths = pathsOf(screen.toJSON() as JsonNode | null);
        for (const path of paths) {
          expect(unpackColor(path.props?.fill)).toBe(
            packedColor(placeholderPalette.shapeDark),
          );
        }
      });

      it('процентный размер проходит в Svg (режим fill)', async () => {
        const screen = await render(<Icon size="58%" />);
        const svg = rootSvg(screen.toJSON() as JsonNode | null);
        expect(svg.props?.width).toBe('58%');
        expect(svg.props?.height).toBe('58%');
      });
    });
  }
});
