/**
 * Тесты индикатора шагов онбординга: точки, порядок,
 * доступность «Шаг N из 4».
 */
import { render } from '@testing-library/react-native';
import { StepIndicator } from '../StepIndicator';

describe('StepIndicator', () => {
  it('шаг role → «Шаг 1 из 4»', async () => {
    const screen = await render(<StepIndicator step="role" />);
    expect(screen.getByLabelText('Шаг 1 из 4')).toBeTruthy();
  });

  it('шаг organization → «Шаг 2 из 4»', async () => {
    const screen = await render(<StepIndicator step="organization" />);
    expect(screen.getByLabelText('Шаг 2 из 4')).toBeTruthy();
  });

  it('шаг location → «Шаг 3 из 4»', async () => {
    const screen = await render(<StepIndicator step="location" />);
    expect(screen.getByLabelText('Шаг 3 из 4')).toBeTruthy();
  });

  it('шаг done → «Шаг 4 из 4»', async () => {
    const screen = await render(<StepIndicator step="done" />);
    expect(screen.getByLabelText('Шаг 4 из 4')).toBeTruthy();
  });

  it('четыре точки-индикатора рендерятся', async () => {
    const screen = await render(<StepIndicator step="role" />);
    const tree = screen.toJSON();
    expect(tree?.children).toHaveLength(4);
  });
});
