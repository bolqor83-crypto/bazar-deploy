/**
 * Экран регистрации: имя, телефон, пароль и его подтверждение,
 * согласие с условиями.
 *
 * Ошибки валидации показываются после blur поля (или после попытки
 * отправки). После успеха — экран онбординга-заглушки /welcome.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Check, Eye, EyeOff } from 'lucide-react-native';
import {
  Button,
  Input,
  Text,
  hapticError,
  hapticSuccess,
  useTheme,
} from '@bazar/ui';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { useAuth } from '../../hooks/useAuth';
import { formatPhoneInput, phoneToE164 } from '../../utils/phone';

interface FieldErrors {
  name?: string;
  phone?: string;
  password?: string;
  confirm?: string;
  terms?: string;
}

/** Пароль: минимум 8 символов, хотя бы одна буква и одна цифра. */
function validatePassword(password: string): string | undefined {
  if (password.length < 8) {
    return 'Минимум 8 символов';
  }
  if (!/[a-zа-яё]/i.test(password) || !/\d/.test(password)) {
    return 'Нужны буквы и цифры';
  }
  return undefined;
}

export default function RegisterScreen() {
  const { colors, spacing } = useTheme();
  const { register, error, clearError } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<keyof FieldErrors, boolean>>({
    name: false,
    phone: false,
    password: false,
    confirm: false,
    terms: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const validate = (): FieldErrors => ({
    name:
      name.trim().length < 2 ? 'Введите имя (минимум 2 символа)' : undefined,
    phone: phoneToE164(phone)
      ? undefined
      : 'Введите номер полностью: +7 (999) 999-99-99',
    password: validatePassword(password),
    confirm: confirm !== password ? 'Пароли не совпадают' : undefined,
    terms: termsAccepted ? undefined : 'Нужно принять условия',
  });

  /** Показывать ошибку поля: после blur или после отправки формы. */
  const visible = (field: keyof FieldErrors): string | null => {
    if (!(touched[field] || submitted)) {
      return null;
    }
    return fieldErrors[field] ?? null;
  };

  const blur = (field: keyof FieldErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors(validate());
  };

  const submit = async () => {
    setSubmitted(true);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      hapticError();
      return;
    }
    setLoading(true);
    const ok = await register({
      name: name.trim(),
      phone: phoneToE164(phone) ?? '',
      password,
    });
    setLoading(false);
    if (ok) {
      hapticSuccess();
      router.replace('/welcome');
    } else {
      hapticError();
    }
  };

  return (
    <AuthScreenShell
      title="Регистрация в Bazar"
      subtitle="Аккаунт один — магазин, опт и доставка переключаются внутри"
    >
      <Input
        label="Имя"
        value={name}
        onChangeText={(value) => {
          setName(value);
          clearError();
        }}
        autoComplete="name"
        placeholder="Как к вам обращаться"
        error={visible('name')}
        onBlur={() => blur('name')}
      />
      <Input
        label="Телефон"
        value={phone}
        onChangeText={(value) => {
          setPhone(formatPhoneInput(value));
          clearError();
        }}
        keyboardType="phone-pad"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+7 (999) 999-99-99"
        error={visible('phone')}
        onBlur={() => blur('phone')}
      />
      <Input
        label="Пароль"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearError();
        }}
        secureTextEntry={!passwordVisible}
        autoComplete="new-password"
        placeholder="Минимум 8 символов, буквы и цифры"
        error={visible('password')}
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
        onBlur={() => blur('password')}
      />
      <Input
        label="Повторите пароль"
        value={confirm}
        onChangeText={(value) => {
          setConfirm(value);
          clearError();
        }}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Ещё раз"
        error={visible('confirm')}
        onBlur={() => blur('confirm')}
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: termsAccepted }}
        accessibilityLabel="Принимаю условия и политику конфиденциальности"
        onPress={() => {
          setTermsAccepted((v) => !v);
          setTouched((prev) => ({ ...prev, terms: true }));
          if (fieldErrors.terms) {
            setFieldErrors((prev) => ({ ...prev, terms: undefined }));
          }
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: 48,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: termsAccepted ? colors.primary : colors.borderStrong,
            backgroundColor: termsAccepted ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {termsAccepted ? <Check size={16} color={colors.onPrimary} /> : null}
        </View>
        <Text variant="bodySmall" color="textSecondary" style={{ flex: 1 }}>
          Принимаю условия и политику конфиденциальности
        </Text>
      </Pressable>
      {visible('terms') ? (
        <Text variant="caption" color="danger">
          {fieldErrors.terms}
        </Text>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        onPress={() => void submit()}
      >
        Зарегистрироваться
      </Button>

      {error ? (
        <Text variant="bodySmall" color="danger" align="center">
          {error}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/login')}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        style={{ minHeight: 48, justifyContent: 'center' }}
      >
        <Text variant="body" color="primary" align="center">
          Уже есть аккаунт? Войти
        </Text>
      </Pressable>
    </AuthScreenShell>
  );
}
