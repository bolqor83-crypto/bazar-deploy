/**
 * Тесты компонента Text.
 */
import { render } from '@testing-library/react-native';
import { Text } from './Text';

describe('Text', () => {
  it('рендерит переданный текст с вариантом body по умолчанию', async () => {
    const screen = await render(<Text>Сумма заказа</Text>);
    expect(screen.getByText('Сумма заказа')).toBeTruthy();
  });

  it('применяет вариант типографики h1', async () => {
    const screen = await render(<Text variant="h1">Заголовок</Text>);
    const node = screen.getByText('Заголовок');
    expect(node.props.style?.[0]?.fontSize).toBe(26);
    expect(node.props.style?.[0]?.fontFamily).toBe('Inter_700Bold');
  });

  it('caption — 14pt после ревизии шкалы', async () => {
    const screen = await render(<Text variant="caption">Подпись</Text>);
    expect(screen.getByText('Подпись').props.style?.[0]?.fontSize).toBe(14);
  });

  it('numberL — табличные цифры без явного mono', async () => {
    const screen = await render(<Text variant="numberL">120</Text>);
    const node = screen.getByText('120');
    expect(node.props.style?.[0]?.fontSize).toBe(24);
    expect(node.props.style?.[1]?.fontVariant).toEqual(['tabular-nums']);
  });

  it('numberXl — 32pt с табличными цифрами', async () => {
    const screen = await render(<Text variant="numberXl">1 250</Text>);
    const node = screen.getByText('1 250');
    expect(node.props.style?.[0]?.fontSize).toBe(32);
    expect(node.props.style?.[1]?.fontVariant).toEqual(['tabular-nums']);
  });

  it('применяет цвет textSecondary из темы', async () => {
    const screen = await render(<Text color="textSecondary">Подпись</Text>);
    const node = screen.getByText('Подпись');
    expect(node.props.style?.[0]?.color).toBe('#565E55');
  });

  it('mono добавляет tabular-nums', async () => {
    const screen = await render(
      <Text mono variant="bodyStrong">
        1 250 000
      </Text>,
    );
    const node = screen.getByText('1 250 000');
    expect(node.props.style?.[1]?.fontVariant).toEqual(['tabular-nums']);
  });

  it('выравнивает по центру', async () => {
    const screen = await render(<Text align="center">Центр</Text>);
    expect(screen.getByText('Центр').props.style?.[0]?.textAlign).toBe(
      'center',
    );
  });

  it('ограничивает число строк', async () => {
    const screen = await render(<Text numberOfLines={2}>Длинный текст</Text>);
    expect(screen.getByText('Длинный текст').props.numberOfLines).toBe(2);
  });
});
