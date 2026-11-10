/**
 * Тесты компонента Divider.
 */
import { render } from '@testing-library/react-native';
import { Divider } from './Divider';

describe('Divider', () => {
  it('горизонтальный по умолчанию: высота 1px', async () => {
    const screen = await render(<Divider />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"height":1');
  });

  it('вертикальный: ширина 1px', async () => {
    const screen = await render(<Divider orientation="vertical" />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"width":1');
  });

  it.each(['none', 'sm', 'md', 'lg'] as const)('inset %s рендерится', async (inset) => {
    const screen = await render(<Divider inset={inset} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('использует цвет border темы', async () => {
    const screen = await render(<Divider />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('#E4EAE4');
  });
});
