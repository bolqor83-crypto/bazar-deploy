/**
 * Тесты компонента Badge.
 */
import { render } from '@testing-library/react-native';
import { Badge } from './Badge';

describe('Badge', () => {
  it('рендерит текст бейджа', async () => {
    const screen = await render(<Badge>Новый</Badge>);
    expect(screen.getByText('Новый')).toBeTruthy();
  });

  it.each(['neutral', 'success', 'warning', 'danger', 'info'] as const)(
    'вариант %s рендерится',
    async (variant) => {
      const screen = await render(<Badge variant={variant}>Статус</Badge>);
      expect(screen.getByText('Статус')).toBeTruthy();
    }
  );

  it('warning использует янтарь, а не красный', async () => {
    const screen = await render(<Badge variant="warning">Долг</Badge>);
    const json = JSON.stringify(screen.toJSON());
    expect(json).not.toContain('#FF0000');
    expect(json).not.toContain('#DC3545');
    expect(json).toContain('#8A6519');
  });

  it.each(['sm', 'md'] as const)('размер %s рендерится', async (size) => {
    const screen = await render(<Badge size={size}>12</Badge>);
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('радиус pill (999)', async () => {
    const screen = await render(<Badge>Статус</Badge>);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('999');
  });
});
