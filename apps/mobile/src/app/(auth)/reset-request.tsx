/**
 * Шаг 1 сброса пароля: телефон → код подтверждения.
 * После отправки — переход на /reset-confirm с телефоном в параметрах.
 */
import { useState } from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, Text, hapticError, hapticSuccess } from '@bazar/ui';
import { Smartphone } from 'lucide-react-native';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { useAuth } from '../../hooks/useAuth';
import { formatPhoneInput, phoneToE164 } from '../../utils/phone';

export default function ResetRequestScreen() {
  const { requestPasswordReset, error, clearError } = useAuth();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const submit = async () => {
    const e164 = phoneToE164(phone);
    if (!e164) {
      setPhoneError('Введите номер полностью: +7 (999) 999-99-99');
      hapticError();
      return;
    }
    setPhoneError(null);
    setLoading(true);
    const ok = await requestPasswordReset(e164);
    setLoading(false);
    if (ok) {
      hapticSuccess();
      // Телефон передаём дальше: экран подтверждения не переспрашивает.
      router.push({ pathname: '/reset-confirm', params: { phone: e164 } });
    } else {
      hapticError();
    }
  };

  return (
    <AuthScreenShell
      title="Сброс пароля"
      icon={Smartphone}
      subtitle="Пришлём код подтверждения на ваш номер"
    >
      <Input
        label="Телефон"
        value={phone}
        onChangeText={(value) => {
          setPhone(formatPhoneInput(value));
          setPhoneError(null);
          clearError();
        }}
        keyboardType="phone-pad"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+7 (999) 999-99-99"
        error={phoneError}
      />
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        onPress={() => void submit()}
      >
        Отправить код
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
          Вернуться ко входу
        </Text>
      </Pressable>
    </AuthScreenShell>
  );
}
