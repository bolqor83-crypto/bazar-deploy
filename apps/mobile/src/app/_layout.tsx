/**
 * Корневой layout Bazar.
 *
 * Порядок запуска:
 * 1. Загрузка шрифтов Inter (useFonts) — до этого UI не показываем.
 * 2. authStore.hydrate() — проверка сохранённой сессии (токен из
 *    AsyncStorage → getSession мок-бэкенда) и синхронизация
 *    contextStore с членствами пользователя.
 * 3. Гидратация contextStore из AsyncStorage (persist).
 * 4. Пока что-либо не готово — держим сплэш, показываем скелетон.
 * 5. SplashScreen.hideAsync() и рендер стеков.
 *
 * Провайдеры: BazarUIProvider (тема + тосты + safe area).
 * Статус-бар следует теме.
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { BazarUIProvider, Skeleton, useTheme } from '@bazar/ui';
import { View } from 'react-native';
import { useContextStore } from '../stores/contextStore';
import { useAuthStore } from '../stores/authStore';
import { useOnboardingStore } from '../stores/onboardingStore';

// Не даём сплэшу скрыться до готовности шрифтов, сессии и контекста.
void SplashScreen.preventAutoHideAsync().catch(() => {
  // На платформах без сплэша — просто продолжаем.
});

/** Стек приложения; показывается только после гидратации. */
function AppStack() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="dev/design" />
      </Stack>
    </>
  );
}

/** Заглушка на время загрузки: скелетон на весь экран (не спиннер). */
function BootSkeleton() {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.xl,
        gap: spacing.md,
      }}
    >
      <Skeleton height={28} width={220} />
      <Skeleton height={16} width="80%" />
      <Skeleton height={16} width="60%" />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const contextHydrated = useContextStore((s) => s.hydrated);
  const authState = useAuthStore((s) => s.state);
  const onboardingHydrated = useOnboardingStore((s) => s.hydrated);

  // Проверка сохранённой сессии и восстановление прогресса
  // онбординга: один вызов каждого при монтировании. hydrate сам
  // синхронизирует contextStore с членствами пользователя.
  useEffect(() => {
    void useAuthStore.getState().hydrate();
    void useOnboardingStore.getState().hydrate();
  }, []);

  const ready =
    fontsLoaded &&
    contextHydrated &&
    onboardingHydrated &&
    authState !== 'unknown';

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync().catch(() => {
        // Сплэш мог быть уже скрыт платформой.
      });
    }
  }, [ready]);

  if (!ready) {
    return <BootSkeleton />;
  }

  return (
    <BazarUIProvider>
      <AppStack />
    </BazarUIProvider>
  );
}
