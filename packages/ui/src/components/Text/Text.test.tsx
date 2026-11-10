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
    expect(node.props.style?.[0]?.fontSize).toBe(28);
    expect(node.props.style?.[0]?.fontFamily).toBe('Inter_700Bold');
  });

  it('применяет цвет textSecondary из темы', async () => {
    const screen = await render(<Text color="textSecondary">Подпись</Text>);
    const node = screen.getByText('Подпись');
    expect(node.props.style?.[0]?.color).toBe('#666D64');
  });

  it('mono добавляет tabular-nums', async () => {
    const screen = await render(
      <Text mono variant="bodyStrong">
        1 250 000
      </Text>
    );
    const node = screen.getByText('1 250 000');
    expect(node.props.style?.[1]?.fontVariant).toEqual(['tabular-nums']);
  });

  it('выравнивает по центру', async () => {
    const screen = await render(<Text align="center">Центр</Text>);
    expect(screen.getByText('Центр').props.style?.[0]?.textAlign).toBe('center');
  });

  it('ограничивает число строк', async () => {
    const screen = await render(<Text numberOfLines={2}>Длинный текст</Text>);
    expect(screen.getByText('Длинный текст').props.numberOfLines).toBe(2);
  });
});
