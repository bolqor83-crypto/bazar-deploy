/**
 * Тесты BottomTabBar: подсветка активной вкладки, onChange, зоны ≥48.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Home, Package, Truck } from 'lucide-react-native';
import { BazarUIProvider } from '@bazar/ui';
import { BottomTabBar } from './BottomTabBar';

const ITEMS = [
  { key: 'home', label: 'Главная', icon: Home },
  { key: 'orders', label: 'Заказы', icon: Package },
  { key: 'deliveries', label: 'Доставки', icon: Truck },
];

async function setup(props: Partial<Parameters<typeof BottomTabBar>[0]> = {}) {
  return render(
    <BazarUIProvider>
      <BottomTabBar items={ITEMS} activeKey="home" onChange={() => {}} {...props} />
    </BazarUIProvider>
  );
}

describe('BottomTabBar', () => {
  it('рендерит все пункты с ролями tab', async () => {
    const screen = await setup();
    expect(screen.getByRole('tab', { name: 'Главная' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Заказы' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Доставки' })).toBeTruthy();
  });

  it('активная вкладка отмечена selected', async () => {
    const screen = await setup();
    expect(screen.getByRole('tab', { name: 'Главная' }).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true })
    );
    expect(screen.getByRole('tab', { name: 'Заказы' }).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false })
    );
  });

  it('onChange вызывается с ключом пункта', async () => {
    const onChange = jest.fn();
    const screen = await setup({ onChange });
    await fireEvent.press(screen.getByRole('tab', { name: 'Заказы' }));
    expect(onChange).toHaveBeenCalledWith('orders');
  });

  it('высота бара 64, зона каждого пункта ≥ 48', async () => {
    const screen = await setup();
    // Родитель вкладки — контейнер бара (в дереве есть обёртки провайдеров).
    const bar = screen.getByRole('tab', { name: 'Главная' }).parent;
    const barStyle = bar?.props?.style;
    const flat = Array.isArray(barStyle) ? barStyle.flat() : [barStyle];
    expect(flat.find((s: { height?: number }) => s?.height === 64)).toBeTruthy();

    for (const label of ['Главная', 'Заказы', 'Доставки']) {
      const item = screen.getByRole('tab', { name: label });
      const style = item.props.style;
      const itemFlat = Array.isArray(style) ? style.flat() : [style];
      const minHeight = itemFlat.find((s: { minHeight?: number }) => typeof s?.minHeight === 'number');
      expect(minHeight?.minHeight ?? 0).toBeGreaterThanOrEqual(48);
    }
  });

  it('активный пункт окрашен в primary, неактивный — textSecondary', async () => {
    const screen = await setup();
    const json = JSON.stringify(screen.toJSON());
    // #2E6B4E — primary (активный), #666D64 — textSecondary (неактивный)
    expect(json).toContain('#2E6B4E');
    expect(json).toContain('#666D64');
  });
});
