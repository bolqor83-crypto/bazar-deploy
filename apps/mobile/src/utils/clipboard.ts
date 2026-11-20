/**
 * Копирование текста в буфер обмена (Промт 18, Часть A).
 *
 * Без новых пакетов (запрет ТЗ): web — navigator.clipboard с
 * фолбэком на скрытую textarea + execCommand (старые webview);
 * native — graceful false, вызывающий код решает, что показать.
 */
import { Platform } from 'react-native';

/** Кладёт текст в буфер обмена. true — удалось. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Переходим к фолбэку ниже (например, не-secure context).
    }
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
  // Native: без установленного пакета Clipboard нативный буфер
  // недоступен; не тянем зависимость — возвращаем false.
  return false;
}
