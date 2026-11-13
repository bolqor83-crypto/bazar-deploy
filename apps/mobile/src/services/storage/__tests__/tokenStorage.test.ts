/**
 * Тесты безопасного хранилища refresh-токена (Промт 10, Часть A).
 *
 * Native: читает/пишет expo-secure-store, миграция переносит
 * токен из AsyncStorage и стирает старый ключ.
 * Web: sessionStorage вместо SecureStore.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  REFRESH_TOKEN_KEY,
  __platformOverride,
  clearStoredRefreshToken,
  getStoredRefreshToken,
  migrateLegacyRefreshToken,
  setStoredRefreshToken,
} from '../tokenStorage';

const secure = SecureStore as unknown as {
  __store: Map<string, string>;
  setItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};

/**
 * Полифилл sessionStorage для jest-expo (окружение его не выдаёт).
 * Устанавливается до импорта тестируемого модуля.
 */
function installSessionStorage(): void {
  if (typeof window === 'undefined') return;
  if (window.sessionStorage) return;
  const backing = new Map<string, string>();
  const stub: Storage = {
    get length() {
      return backing.size;
    },
    clear: () => backing.clear(),
    getItem: (k: string) => backing.get(k) ?? null,
    key: (i: number) => Array.from(backing.keys())[i] ?? null,
    removeItem: (k: string) => void backing.delete(k),
    setItem: (k: string, v: string) => void backing.set(k, v),
  };
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    value: stub,
  });
}
installSessionStorage();

beforeEach(() => {
  __platformOverride.value = null; // native по умолчанию
  secure.__store.clear();
  secure.setItemAsync.mockClear();
  secure.getItemAsync.mockClear();
  secure.deleteItemAsync.mockClear();
  AsyncStorage.clear();
  if (typeof window !== 'undefined') {
    window.sessionStorage.clear();
  }
});

describe('native: expo-secure-store', () => {
  it('записывает и читает токен по ключу bazar.auth.refresh', async () => {
    await setStoredRefreshToken('rt-1');
    expect(secure.__store.get(REFRESH_TOKEN_KEY)).toBe('rt-1');
    await expect(getStoredRefreshToken()).resolves.toBe('rt-1');
    expect(secure.setItemAsync).toHaveBeenCalledWith(
      REFRESH_TOKEN_KEY,
      'rt-1',
    );
  });

  it('стирает токен', async () => {
    await setStoredRefreshToken('rt-1');
    await clearStoredRefreshToken();
    await expect(getStoredRefreshToken()).resolves.toBeNull();
    expect(secure.deleteItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
  });

  it('не падает при ошибке хранилища', async () => {
    secure.setItemAsync.mockRejectedValueOnce(new Error('keystore full'));
    await expect(setStoredRefreshToken('rt-2')).resolves.toBeUndefined();
    secure.getItemAsync.mockRejectedValueOnce(new Error('locked'));
    await expect(getStoredRefreshToken()).resolves.toBeNull();
  });
});

describe('миграция из AsyncStorage', () => {
  it('переносит токен и удаляет старый ключ', async () => {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, 'legacy-rt');
    await migrateLegacyRefreshToken();
    expect(secure.__store.get(REFRESH_TOKEN_KEY)).toBe('legacy-rt');
    await expect(
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    ).resolves.toBeNull();
  });

  it('не затирает уже существующий токен в SecureStore', async () => {
    secure.__store.set(REFRESH_TOKEN_KEY, 'fresh-rt');
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, 'legacy-rt');
    await migrateLegacyRefreshToken();
    expect(secure.__store.get(REFRESH_TOKEN_KEY)).toBe('fresh-rt');
    await expect(
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    ).resolves.toBeNull();
  });

  it('no-op, когда AsyncStorage пуст', async () => {
    await migrateLegacyRefreshToken();
    expect(secure.setItemAsync).not.toHaveBeenCalled();
    expect(secure.__store.size).toBe(0);
  });
});

describe('web: sessionStorage', () => {
  it('хранит токен в sessionStorage, не трогая SecureStore', async () => {
    __platformOverride.value = 'web';
    await setStoredRefreshToken('web-rt');
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('web-rt');
    expect(secure.setItemAsync).not.toHaveBeenCalled();
    await expect(getStoredRefreshToken()).resolves.toBe('web-rt');
  });

  it('стирает токен из sessionStorage', async () => {
    __platformOverride.value = 'web';
    await setStoredRefreshToken('web-rt');
    await clearStoredRefreshToken();
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('миграция переносит legacy-токен в sessionStorage', async () => {
    __platformOverride.value = 'web';
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, 'legacy-web');
    await migrateLegacyRefreshToken();
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe(
      'legacy-web',
    );
    await expect(
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    ).resolves.toBeNull();
  });
});
