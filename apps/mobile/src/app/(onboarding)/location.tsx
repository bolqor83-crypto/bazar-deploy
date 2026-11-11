/**
 * Шаг 3 онбординга: создание торговой точки.
 *
 * Только для владельца точки: точка принадлежит только что созданной
 * организации. После создания — финальный экран.
 */
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Button, Input, Text, hapticError, hapticSuccess } from '@bazar/ui';
import { OnboardingShell } from '../../components/onboarding/OnboardingShell';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function OnboardingLocationScreen() {
  const draft = useOnboardingStore((s) => s.locationDraft);
  const organizationDraft = useOnboardingStore((s) => s.organizationDraft);
  const submitting = useOnboardingStore((s) => s.submitting);
  const error = useOnboardingStore((s) => s.error);
  const clearError = useOnboardingStore((s) => s.clearError);

  const [form, setForm] = useState({
    name: draft?.name ?? '',
    address: draft?.address ?? '',
  });

  // Возобновление после перезагрузки: черновик может прийти позже
  // первого рендера (гидратация асинхронна) — восстанавливаем значения
  // при его появлении.
  useEffect(() => {
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- черновик пришёл после гидратации
      setForm({ name: draft.name, address: draft.address });
    }
  }, [draft]);

  const submit = async () => {
    const ok = await useOnboardingStore.getState().submitLocation({
      name: form.name.trim(),
      address: form.address.trim(),
    });
    if (ok) {
      hapticSuccess();
      router.push('/done');
    } else {
      hapticError();
    }
  };

  return (
    <OnboardingShell title="Торговая точка" step="location">
      <Text variant="body" color="textSecondary">
        Точка продаж организации «{organizationDraft?.name ?? 'организации'}».
        Вся сеть видна в шапке, точку можно сменить в любой момент.
      </Text>

      <Input
        label="Название точки"
        value={form.name}
        onChangeText={(value) => {
          setForm((prev) => ({ ...prev, name: value }));
          clearError();
        }}
        placeholder="Например: Точка на Западном"
        autoCapitalize="words"
      />
      <Input
        label="Адрес"
        value={form.address}
        onChangeText={(value) => {
          setForm((prev) => ({ ...prev, address: value }));
          clearError();
        }}
        placeholder="Город, улица, дом"
        autoCapitalize="sentences"
      />

      {error ? (
        <Text variant="bodySmall" color="danger">
          {error}
        </Text>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={submitting}
        onPress={() => void submit()}
      >
        Продолжить
      </Button>
    </OnboardingShell>
  );
}
