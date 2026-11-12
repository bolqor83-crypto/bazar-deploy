/**
 * Экран входа: телефон + пароль.
 *
 * При недоступном API (health-check не прошёл) — ErrorState с
 * кнопкой «Повторить» вместо формы (graceful degradation, Промт 7:
 * мок-аутентификация удалена, падать в мок нельзя).
 *
 * Быстрые ссылки: сброс пароля, вход по SMS-коду, регистрация.
 * В __DEV__ — кнопка быстрого входа под демо-пользователем
 * (Иван Петров, реальные данные из БД). В production-сборке её нет.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react-native';
import {
  Badge,
  Button,
  Divider,
  ErrorState,
  Input,
  Text,
  hapticError,
  hapticSuccess,
  useTheme,
} from '@bazar/ui';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/api/authApi';
import { formatPhoneInput, phoneToE164 } from '../../utils/phone';

interface FieldErrors {
  phone?: string;
  password?: string;
}

/** Ссылка-строка под полями (зона нажатия ≥ 48). */
function LinkRow({ label, target }: { label: string; target: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(target)}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      style={{ minHeight: 48, justifyContent: 'center' }}
    >
      <Text variant="body" color="primary" align="center">
        {label}
      </Text>
    </Pressable>
  );
}

export default function LoginScreen() {
  const { colors, spacing } = useTheme();
  const { login, error, clearError } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // null — проверка ещё идёт (форму не блокируем), false — API недоступен.
  const [apiAlive, setApiAlive] = useState<boolean | null>(null);

  const checkApi = useCallback(() => {
    let cancelled = false;
    void authApi.ping().then((alive) => {
      if (!cancelled) {
        setApiAlive(alive);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(checkApi, [checkApi]);

  const validate = (phoneValue: string, passwordValue: string): FieldErrors => {
    const errors: FieldErrors = {};
    if (!phoneToE164(phoneValue)) {
      errors.phone = 'Введите номер полностью: +7 (999) 999-99-99';
    }
    if (!passwordValue) {
      errors.password = 'Введите пароль';
    }
    return errors;
  };

  const doLogin = async (phoneValue: string, passwordValue: string) => {
    // Валидируем переданные значения (быстрый вход передаёт их напрямую,
    // стейт мог не обновиться) — ошибки при этом показываются в полях.
    const errors = validate(phoneValue, passwordValue);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      hapticError();
      return;
    }
    setLoading(true);
    const ok = await login({
      phone: phoneToE164(phoneValue) ?? '',
      password: passwordValue,
    });
    setLoading(false);
    if (ok) {
      hapticSuccess();
      // Навигацию выполняет AuthGuard зоны (auth): без членств —
      // на онбординг /welcome, с членствами — в /(tabs).
    } else {
      hapticError();
    }
  };

  const onChangePhone = (value: string) => {
    setPhone(formatPhoneInput(value));
    if (fieldErrors.phone) {
      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
    }
    clearError();
  };

  const onChangePassword = (value: string) => {
    setPassword(value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
    clearError();
  };

  return (
    <AuthScreenShell
      title="Вход в Bazar"
      icon={LockKeyhole}
      subtitle="Оптовая торговля и розница — в одном приложении"
    >
      {apiAlive === false ? (
        <ErrorState
          title="Сервер временно недоступен"
          description="Проверьте соединение и попробуйте ещё раз"
          onRetry={() => {
            setApiAlive(null);
            checkApi();
          }}
        />
      ) : (
        <>
          <Input
            label="Телефон"
            value={phone}
            onChangeText={onChangePhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+7 (999) 999-99-99"
            error={fieldErrors.phone ?? null}
            onBlur={() =>
              setFieldErrors((prev) => ({
                ...prev,
                ...validate(phone, password),
              }))
            }
          />
          <Input
            label="Пароль"
            value={password}
            onChangeText={onChangePassword}
            secureTextEntry={!passwordVisible}
            autoComplete="password"
            placeholder="Ваш пароль"
            error={fieldErrors.password ?? null}
            rightIcon={
              passwordVisible ? (
                <EyeOff size={22} color={colors.textSecondary} />
              ) : (
                <Eye size={22} color={colors.textSecondary} />
              )
            }
            rightIconAccessibilityLabel={
              passwordVisible ? 'Скрыть пароль' : 'Показать пароль'
            }
            onRightIconPress={() => setPasswordVisible((v) => !v)}
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={() => void doLogin(phone, password)}
          >
            Войти
          </Button>

          {error ? (
            <Text variant="bodySmall" color="danger" align="center">
              {error}
            </Text>
          ) : null}

          <LinkRow label="Забыли пароль?" target="/reset-request" />

          <Divider inset="lg" />

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={loading}
            onPress={() => router.push('/otp')}
          >
            Войти по коду из SMS
          </Button>

          <LinkRow
            label="Нет аккаунта? Зарегистрироваться"
            target="/register"
          />

          {__DEV__ ? (
            <View
              style={{
                marginTop: spacing.xl,
                gap: spacing.sm,
                alignItems: 'center',
              }}
            >
              <Badge variant="warning" size="sm">
                DEV
              </Badge>
              <Button
                variant="secondary"
                size="md"
                disabled={loading}
                onPress={() => {
                  setPhone('+7 (900) 123-45-67');
                  setPassword('qwerty123');
                  void doLogin('+79001234567', 'qwerty123');
                }}
              >
                Продолжить как Иван Петров
              </Button>
              <Text variant="caption" color="textMuted" align="center">
                Быстрый вход под демо-пользователем (реальная БД). Только в
                разработке.
              </Text>
            </View>
          ) : null}
        </>
      )}
    </AuthScreenShell>
  );
}
