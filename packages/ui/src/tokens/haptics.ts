/**
 * Хаптика Bazar.
 *
 * - tap → impact(Light)
 * - success / warning / error → notification
 * - selection → selectionAsync
 *
 * Троттлинг 150 мс на уровне модуля: частые нажатия не создают
 * очередь вибраций. На web и в симуляторе — no-op.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Метка времени последнего срабатывания (общая на модуль). */
let lastHapticAt = 0;
const THROTTLE_MS = 150;

function throttled(): boolean {
  const now = Date.now();
  if (now - lastHapticAt < THROTTLE_MS) {
    return false;
  }
  lastHapticAt = now;
  return true;
}

/** Платформа без хаптики — не дёргаем нативный модуль. */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Лёгкий отклик на нажатие кнопки. */
export function hapticTap(): void {
  if (!supported || !throttled()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // Хаптика не критична: молча игнорируем сбой.
  });
}

/** Отклик на успешное действие. */
export function hapticSuccess(): void {
  if (!supported || !throttled()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Отклик на предупреждение. */
export function hapticWarning(): void {
  if (!supported || !throttled()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** Отклик на ошибку. */
export function hapticError(): void {
  if (!supported || !throttled()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

/** Отклик на выбор (переключение вкладки, сегмента, контекста). */
export function hapticSelection(): void {
  if (!supported || !throttled()) return;
  void Haptics.selectionAsync().catch(() => {});
}

/** Только для тестов: сброс троттлинга. */
export function __resetHapticThrottleForTests(): void {
  lastHapticAt = 0;
}
