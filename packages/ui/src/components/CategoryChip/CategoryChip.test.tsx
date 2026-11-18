/**
 * Тесты CategoryChip: подпись, активность, нажатие, иконка.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Carrot } from 'lucide-react-native';
import { IconCarrot } from '../../icons';
import { CategoryChip } from './CategoryChip';

describe('CategoryChip', () => {
  it('показывает подпись категории', async () => {
    const screen = await render(<CategoryChip label="Овощи" />);
    expect(screen.getByText('Овощи')).toBeTruthy();
  });

  it('нажатие вызывает onPress', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <CategoryChip label="Овощи" onPress={onPress} />,
    );
    await fireEvent.press(screen.getByLabelText('Категория: Овощи'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('активный чип помечается selected', async () => {
    const screen = await render(
      <CategoryChip label="Все" active onPress={jest.fn()} />,
    );
    expect(
      screen.getByLabelText('Категория: Все').props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('неактивный чип не selected', async () => {
    const screen = await render(
      <CategoryChip label="Фрукты" onPress={jest.fn()} />,
    );
    expect(
      screen.getByLabelText('Категория: Фрукты').props.accessibilityState,
    ).toMatchObject({ selected: false });
  });

  it('без onPress рендерится статично (без кнопки)', async () => {
    const screen = await render(<CategoryChip label="Крупы" icon={Carrot} />);
    expect(screen.queryByLabelText('Категория: Крупы')).toBeNull();
    expect(screen.getByText('Крупы')).toBeTruthy();
  });
});

describe('CategoryChip с цветной SVG-иконкой (Промт 15)', () => {
  it('цветная иконка рендерится размером 20 (без color)', async () => {
    const screen = await render(
      <CategoryChip label="Овощи" icon={IconCarrot} />,
    );
    // Корневой Svg — узел с viewBox внутри чипа.
    const nodes = (function walk(
      node: unknown,
      acc: { type?: unknown; props?: Record<string, unknown> }[] = [],
    ): { type?: unknown; props?: Record<string, unknown> }[] {
      if (!node || typeof node !== 'object') {
        return acc;
      }
      const record = node as {
        type?: unknown;
        props?: Record<string, unknown>;
        children?: unknown[];
      };
      acc.push(record);
      for (const child of record.children ?? []) {
        walk(child, acc);
      }
      return acc;
    })(screen.toJSON(), []);
    const svg = nodes.find((node) => node.type === 'RNSVGSvgView');
    expect(svg).toBeDefined();
    expect(svg?.props?.width).toBe(20);
    expect(svg?.props?.height).toBe(20);
  });

  it('монохромная Lucide-иконка рендерится как раньше (совместимость)', async () => {
    const screen = await render(<CategoryChip label="Овощи" icon={Carrot} />);
    expect(screen.getByText('Овощи')).toBeTruthy();
  });
});
