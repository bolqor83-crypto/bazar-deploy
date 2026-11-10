/**
 * Тесты компонента Card.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from '../Text';
import { Card } from './Card';

describe('Card', () => {
  it('рендерит детей', async () => {
    const screen = await render(
      <Card>
        <Text>Содержимое карточки</Text>
      </Card>
    );
    expect(screen.getByText('Содержимое карточки')).toBeTruthy();
  });

  it('с onPress получает роль button и нажимается', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Card onPress={onPress}>
        <Text>Тап</Text>
      </Card>
    );
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['default', 'elevated', 'outlined'] as const)('вариант %s рендерится', async (variant) => {
    const screen = await render(<Card variant={variant} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('outlined использует borderStrong', async () => {
    const screen = await render(<Card variant="outlined" />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('#C9D2C9');
  });
});
