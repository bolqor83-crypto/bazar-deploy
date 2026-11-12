/**
 * Шаг 2 сброса пароля: код из SMS + новый пароль.
 * После успеха — диалог «Пароль изменён» и возврат на /login.
 */
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Dialog,
  Input,
  Text,
  hapticError,
  hapticSuccess,
  useTheme,
} from '@bazar/ui';
import { ShieldCheck } from 'lucide-react-native';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { useAuth } from '../../hooks/useAuth';
import { formatPhoneInput, phoneToE164 } from '../../utils/phone';

/** Новый пароль: минимум 8 символов, буквы и цифры. */
function validatePassword(password: string): string | undefined {
  if (password.length < 8) {
    return 'Минимум 8 символов';
  }
  if (!/[a-zа-яё]/i.test(password) || !/\d/.test(password)) {
    return 'Нужны буквы и цифры';
  }
  return undefined;
}

export default function ResetConfirmScreen() {
  const { spacing } = useTheme();
  const { resetPassword, error, clearError } = useAuth();
  const params = useLocalSearchParams<{ phone?: string }>();

  const [phone, setPhone] = useState(
    params.phone ? formatPhoneInput(String(params.phone)) : '',
  );
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{
    phone?: string;
    otp?: string;
    password?: string;
    confirm?: string;
  }>({});

  const validate = () => ({
    phone: phoneToE164(phone) ? undefined : 'Введите номер полностью',
    otp:
      otp.replace(/\D/g, '').length === 6 ? undefined : 'Введите 6 цифр кода',
    password: validatePassword(password),
    confirm: confirm === password ? undefined : 'Пароли не совпадают',
  });

  const submit = async () => {
    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.values(fieldErrors).some(Boolean)) {
      hapticError();
      return;
    }
    setLoading(true);
    const ok = await resetPassword(
      phoneToE164(phone) ?? '',
      otp.replace(/\D/g, ''),
      password,
    );
    setLoading(false);
    if (ok) {
      hapticSuccess();
      setDone(true);
    } else {
      hapticError();
    }
  };

  return (
    <AuthScreenShell
      title="Новый пароль"
      icon={ShieldCheck}
      subtitle="Введите код из SMS и придумайте новый пароль"
    >
      <Input
        label="Телефон"
        value={phone}
        onChangeText={(value) => {
          setPhone(formatPhoneInput(value));
          clearError();
        }}
        keyboardType="phone-pad"
        inputMode="tel"
        placeholder="+7 (999) 999-99-99"
        error={errors.phone ?? null}
      />
      <Input
        label="Код из SMS"
        value={otp}
        onChangeText={(value) => {
          setOtp(value.replace(/\D/g, '').slice(0, 6));
          clearError();
        }}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="6 цифр"
        error={errors.otp ?? null}
      />
      <Input
        label="Новый пароль"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearError();
        }}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Минимум 8 символов, буквы и цифры"
        error={errors.password ?? null}
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
        error={errors.confirm ?? null}
      />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        onPress={() => void submit()}
      >
        Сохранить пароль
      </Button>

      {error ? (
        <Text variant="bodySmall" color="danger" align="center">
          {error}
        </Text>
      ) : null}

      <Dialog
        visible={done}
        onClose={() => setDone(false)}
        title="Пароль изменён"
        dismissable={false}
      >
        <Text
          variant="body"
          color="textSecondary"
          style={{ marginBottom: spacing.lg }}
        >
          Пароль изменён. Войдите заново с новым паролем.
        </Text>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.replace('/login')}
        >
          Войти
        </Button>
      </Dialog>
    </AuthScreenShell>
  );
}
