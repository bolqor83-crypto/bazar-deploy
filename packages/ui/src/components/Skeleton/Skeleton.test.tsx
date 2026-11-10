/**
 * Тесты компонента Skeleton.
 */
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { Text } from '../Text';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('рендерит блок с заданными размерами', async () => {
    const screen = await render(<Skeleton width={200} height={48} />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"width":200');
    expect(json).toContain('"height":48');
  });

  it('в дереве нет текста', async () => {
    const screen = await render(
      <View>
        <Skeleton width={200} height={20} />
      </View>
    );
    expect(screen.queryByText(/.+/)).toBeNull();
  });

  it('скрыт от служб доступности', async () => {
    const screen = await render(<Skeleton />);
    const node = screen.toJSON();
    expect(node?.props?.accessibilityElementsHidden).toBe(true);
    expect(node?.props?.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('не мешает настоящему тексту рядом', async () => {
    const screen = await render(
      <View>
        <Skeleton width={120} height={12} />
        <Text>Настоящий текст</Text>
      </View>
    );
    expect(screen.getByText('Настоящий текст')).toBeTruthy();
    expect(screen.queryAllByText(/.+/)).toHaveLength(1);
  });
});
