/**
 * Шаг 2 онбординга: создание организации.
 *
 * Название и адрес; тип организации определяется выбранной ролью
 * (точка — розница, оптовик — опт, перевозчик — логистика).
 * После создания владелец точки настраивает торговую точку,
 * остальные переходят к финальному экрану.
 */
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Button, Input, Text, hapticError, hapticSuccess } from '@bazar/ui';
import { OnboardingShell } from '../../components/onboarding/OnboardingShell';
import { useOnboardingStore } from '../../stores/onboardingStore';

/** Подзаголовок шага по роли. */
const SUBTITLE: Record<string, string> = {
  store_owner: 'Розничная сеть или отдельный магазин',
  wholesale_seller: 'Оптовая компания с каталогом и ценами',
  carrier: 'Транспортная компания или частный перевозчик',
};

export default function OnboardingOrganizationScreen() {
  const role = useOnboardingStore((s) => s.role);
  const draft = useOnboardingStore((s) => s.organizationDraft);
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
    const ok = await useOnboardingStore.getState().submitOrganization({
      name: form.name.trim(),
      address: form.address.trim(),
      kind: 'retail',
    });
    if (ok) {
      hapticSuccess();
      const step = useOnboardingStore.getState().step;
      router.push(step === 'location' ? '/location' : '/done');
    } else {
      hapticError();
    }
  };

  return (
    <OnboardingShell title="Организация" step="organization">
      <Text variant="body" color="textSecondary">
        {role ? SUBTITLE[role] : 'Ваша организация в Bazar'}
      </Text>

      <Input
        label="Название"
        value={form.name}
        onChangeText={(value) => {
          setForm((prev) => ({ ...prev, name: value }));
          clearError();
        }}
        placeholder="Например: Фермерский двор"
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

      <Text variant="caption" color="textMuted" align="center">
        Данные можно изменить позже в настройках профиля
      </Text>
    </OnboardingShell>
  );
}
