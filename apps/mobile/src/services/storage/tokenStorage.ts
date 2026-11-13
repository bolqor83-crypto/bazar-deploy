/**
 * Безопасное хранилище refresh-токена (Промт 10, Часть A).
 *
 * Native: expo-secure-store — токен уходит в Android Keystore /
 * iOS Keychain, а не в файл AsyncStorage.
 * Web: sessionStorage (вкладка) — осознанный компромисс expo-web:
 * sessionStorage недоступен из других вкладок и стирается при
 * закрытии, XSS-эксплойт всё равно читает память процесса.
 *
 * Миграция при hydrate: токен, оставшийся в AsyncStorage со времён
 * Промтов 7–9, переносится в безопасное хранилище и удаляется из
 * старого — один раз, идемпотентно.
 *
 * Access-токен сюда не попадает: он живёт только в памяти client.ts.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/** Ключ refresh-токена (единый для SecureStore и sessionStorage). */
export const REFRESH_TOKEN_KEY = 'bazar.auth.refresh';

/** Плейсхолдер платформы для тестов. */
export const __platformOverride: { value: string | null } = { value: null };

function isWeb(): boolean {
  const platform =
    __platformOverride.value ?? (Platform.OS as string | undefined);
  return platform === 'web';
}

/**
 * Web: безопасный доступ к sessionStorage — в приватном режиме
 * Safari и старых WebView запись бросает исключение.
 */
function webSession(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Читает refresh-токен из безопасного хранилища. */
export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    if (isWeb()) {
      return webSession()?.getItem(REFRESH_TOKEN_KEY) ?? null;
    }
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // Хранилище недоступно: сессия не переживёт перезапуск.
    return null;
  }
}

/** Записывает (null — стирает) refresh-токен. */
export async function setStoredRefreshToken(
  token: string | null,
): Promise<void> {
  try {
    if (isWeb()) {
      const session = webSession();
      if (!session) return;
      if (token === null) {
        session.removeItem(REFRESH_TOKEN_KEY);
      } else {
        session.setItem(REFRESH_TOKEN_KEY, token);
      }
      return;
    }
    if (token === null) {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } else {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    }
  } catch {
    // Хранилище недоступно: сессия не переживёт перезапуск.
  }
}

/** Стирает refresh-токен (псевдоним для читаемости). */
export async function clearStoredRefreshToken(): Promise<void> {
  await setStoredRefreshToken(null);
}

/**
 * Миграция токена из AsyncStorage (Промты 7–9) в безопасное
 * хранилище. Вызывается один раз при hydrate. Идемпотентна:
 * пустой AsyncStorage — no-op. Токен из безопасного хранилища
 * приоритетнее: старый стирается.
 */
export async function migrateLegacyRefreshToken(): Promise<void> {
  let legacy: string | null = null;
  try {
    legacy = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    legacy = null;
  }
  if (legacy === null) {
    return;
  }
  const current = await getStoredRefreshToken();
  if (current === null && legacy.length > 0) {
    await setStoredRefreshToken(legacy);
  }
  try {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Старый ключ не удалился: токен уже перенесён, дубликат
    // останется до переустановки — не критично.
  }
}
