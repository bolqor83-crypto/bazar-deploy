/**
 * ThemeToggle — переключатель темы в шапке.
 * Цикл: light → dark → system. Иконки: Sun / Moon / Monitor.
 */
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react-native';
import { IconButton, hapticSelection, useThemeStore, type ThemeMode } from '@bazar/ui';

const ICONS: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<ThemeMode, string> = {
  light: 'Тема: светлая',
  dark: 'Тема: тёмная',
  system: 'Тема: системная',
};

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const cycleMode = useThemeStore((s) => s.cycleMode);
  const Icon = ICONS[mode];

  return (
    <IconButton
      icon={Icon}
      accessibilityLabel={LABELS[mode]}
      variant="ghost"
      size="sm"
      haptic={false}
      onPress={() => {
        hapticSelection();
        cycleMode();
      }}
    />
  );
}
