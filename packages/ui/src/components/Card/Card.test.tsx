/**
 * Тесты компонента Card (Промт 14b: 4 варианта).
 */
import { fireEvent, render } from '@testing-library/react-native';
import { useThemeStore } from '../../theme/themeStore';
import { Text } from '../Text';
import { Card } from './Card';

describe('Card', () => {
  afterEach(() => {
    useThemeStore.getState().setMode('system');
  });

  it('рендерит детей', async () => {
    const screen = await render(
      <Card>
        <Text>Содержимое карточки</Text>
      </Card>,
    );
    expect(screen.getByText('Содержимое карточки')).toBeTruthy();
  });

  it('с onPress получает роль button и нажимается', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Card onPress={onPress}>
        <Text>Тап</Text>
      </Card>,
    );
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['default', 'elevated', 'outlined', 'flat'] as const)(
    'вариант %s рендерится',
    async (variant) => {
      const screen = await render(<Card variant={variant} />);
      expect(screen.toJSON()).toBeTruthy();
    },
  );

  it('default (light): shadow sm, без border', async () => {
    const screen = await render(<Card testID="card" />);
    const flat = [screen.getByTestId('card').props.style].flat(Infinity);
    const style = Object.assign({}, ...flat) as Record<string, unknown>;
    expect(style.elevation).toBe(2); // shadows.sm → android elevation 2
    expect(style.borderWidth).toBeUndefined(); // без border
    expect(style.shadowRadius).toBe(3); // shadows.sm
  });

  it('elevated (light): shadow md, без border', async () => {
    const screen = await render(<Card testID="card" variant="elevated" />);
    const flat = [screen.getByTestId('card').props.style].flat(Infinity);
    const style = Object.assign({}, ...flat) as Record<string, unknown>;
    expect(style.elevation).toBe(6); // shadows.md → android elevation 6
    expect(style.borderWidth).toBeUndefined();
  });

  it('outlined: border borderStrong, без shadow', async () => {
    const screen = await render(<Card testID="card" variant="outlined" />);
    const flat = [screen.getByTestId('card').props.style].flat(Infinity);
    const style = Object.assign({}, ...flat) as Record<string, unknown>;
    expect(style.borderColor).toBe('#666D66');
    expect(style.borderWidth).toBe(1);
    expect(style.elevation).toBeUndefined();
  });

  it('flat: ни border, ни shadow', async () => {
    const screen = await render(<Card testID="card" variant="flat" />);
    const flat = [screen.getByTestId('card').props.style].flat(Infinity);
    const style = Object.assign({}, ...flat) as Record<string, unknown>;
    expect(style.borderWidth).toBeUndefined();
    expect(style.elevation).toBeUndefined();
    expect(style.shadowRadius).toBeUndefined();
  });

  it('default в dark: граница вместо тени (ADR 0002)', async () => {
    useThemeStore.getState().setMode('dark');
    const screen = await render(<Card testID="card" />);
    const flat = [screen.getByTestId('card').props.style].flat(Infinity);
    const style = Object.assign({}, ...flat) as Record<string, unknown>;
    expect(style.borderColor).toBe('#6E746F'); // colorsDark.border
    expect(style.borderWidth).toBe(1);
    expect(style.elevation).toBeUndefined();
  });

  it('радиус md и padding lg (воздух 14b)', async () => {
    const screen = await render(<Card testID="card" />);
    const flat = [screen.getByTestId('card').props.style].flat(Infinity);
    const style = Object.assign({}, ...flat) as Record<string, unknown>;
    expect(style.borderRadius).toBe(16); // radii.md
    expect(style.padding).toBe(20); // spacing.lg
  });
});
