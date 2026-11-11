/**
 * Экран входа по SMS-коду: два шага.
 *
 * Шаг 1 — телефон, «Отправить код». Шаг 2 — код из SMS (маска
 * 999-999) и таймер повторной отправки (60 с).
 *
 * В __DEV__ — подсказка, что код выводится в консоль (мок).
 * В production-сборке подсказки нет.
 */
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
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
import {
  formatOtpInput,
  formatPhoneInput,
  phoneToE164,
} from '../../utils/phone';

const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const { spacing } = useTheme();
  const { sendOtp, loginWithOtp, error, clearError } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Таймер повторной отправки: тикает раз в секунду до нуля.
  useEffect(() => {
    if (secondsLeft <= 0) {
      return undefined;
    }
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const requestCode = async () => {
    const e164 = phoneToE164(phone);
    if (!e164) {
      setPhoneError('Введите номер полностью: +7 (999) 999-99-99');
      hapticError();
      return;
    }
    setPhoneError(null);
    setLoading(true);
    const ok = await sendOtp(e164);
    setLoading(false);
    if (ok) {
      setStep(2);
      setSecondsLeft(RESEND_SECONDS);
      hapticSuccess();
    } else {
      hapticError();
    }
  };

  const confirmCode = async () => {
    const e164 = phoneToE164(phone);
    const digits = code.replace(/\D/g, '');
    if (!e164 || digits.length !== 6) {
      setCodeError('Введите 6 цифр кода');
      hapticError();
      return;
    }
    setCodeError(null);
    setLoading(true);
    const ok = await loginWithOtp(e164, digits);
    setLoading(false);
    if (ok) {
      hapticSuccess();
      // Навигацию выполняет AuthGuard зоны (auth): без членств —
      // на онбординг /welcome, с членствами — в /(tabs).
    } else {
      hapticError();
    }
  };

  return (
    <AuthScreenShell
      title="Вход по коду"
      subtitle={
        step === 1
          ? 'Пришлём одноразовый код на телефон'
          : `Код отправлен на ${phone}`
      }
    >
      {step === 1 ? (
        <>
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
            onPress={() => void requestCode()}
          >
            Отправить код
          </Button>
        </>
      ) : (
        <>
          <Input
            label="Код из SMS"
            value={code}
            onChangeText={(value) => {
              setCode(formatOtpInput(value));
              setCodeError(null);
              clearError();
            }}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="sms-otp"
            placeholder="000-000"
            error={codeError}
          />
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={() => void confirmCode()}
          >
            Войти
          </Button>

          {secondsLeft > 0 ? (
            <Text variant="bodySmall" color="textSecondary" align="center">
              {`Отправить повторно через ${secondsLeft} с`}
            </Text>
          ) : (
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                setSecondsLeft(RESEND_SECONDS);
                void requestCode();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <Text variant="body" color="primary" align="center">
                Отправить код повторно
              </Text>
            </Pressable>
          )}
        </>
      )}

      {error ? (
        <Text variant="bodySmall" color="danger" align="center">
          {error}
        </Text>
      ) : null}

      {__DEV__ ? (
        <Text
          variant="caption"
          color="textMuted"
          align="center"
          style={{ marginTop: spacing.md }}
        >
          DEV: код показывается в консоли сервера
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/login')}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        style={{ minHeight: 48, justifyContent: 'center' }}
      >
        <Text variant="body" color="primary" align="center">
          Войти по паролю
        </Text>
      </Pressable>
    </AuthScreenShell>
  );
}
