/**
 * Тесты ThemeToggle: цикл light → dark → system, хаптика.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { BazarUIProvider, __resetHapticThrottleForTests, useThemeStore } from '@bazar/ui';
import * as Haptics from 'expo-haptics';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'light', hydrated: true });
    __resetHapticThrottleForTests();
    jest.mocked(Haptics.selectionAsync).mockClear();
  });

  it('показывает метку текущей темы', async () => {
    const screen = await render(
      <BazarUIProvider>
        <ThemeToggle />
      </BazarUIProvider>
    );
    expect(screen.getByLabelText('Тема: светлая')).toBeTruthy();
  });

  it('циклически переключает light → dark → system → light', async () => {
    const screen = await render(
      <BazarUIProvider>
        <ThemeToggle />
      </BazarUIProvider>
    );
    const button = screen.getByLabelText('Тема: светлая');

    await fireEvent.press(button);
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(screen.getByLabelText('Тема: тёмная')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Тема: тёмная'));
    expect(useThemeStore.getState().mode).toBe('system');
    expect(screen.getByLabelText('Тема: системная')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Тема: системная'));
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('вызывает хаптику selection при переключении', async () => {
    const screen = await render(
      <BazarUIProvider>
        <ThemeToggle />
      </BazarUIProvider>
    );
    await fireEvent.press(screen.getByLabelText('Тема: светлая'));
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });
});
