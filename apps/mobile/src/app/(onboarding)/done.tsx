/**
 * Финальный экран онбординга.
 *
 * Сводка выбранного: роль, организация, точка. Кнопка «Начать работу»
 * завершает онбординг: создаёт членство, синхронирует пользователя
 * и контекст (см. onboardingStore.finish) и уводит в приложение.
 */
import { View } from 'react-native';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Button, Text, hapticError, hapticSuccess, useTheme } from '@bazar/ui';
import type { Role } from '@bazar/types';
import { OnboardingShell } from '../../components/onboarding/OnboardingShell';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { ROLE_LABEL } from '../../components/shell/navigation';

/** Названия ролей онбординга (единые с навигацией). */
const ROLE_NAME: Record<Role, string> = {
  customer: ROLE_LABEL.customer,
  store_owner: ROLE_LABEL.store_owner,
  wholesale_seller: ROLE_LABEL.wholesale_seller,
  carrier: ROLE_LABEL.carrier,
};

export default function OnboardingDoneScreen() {
  const { colors, spacing, radii } = useTheme();
  const role = useOnboardingStore((s) => s.role);
  const organizationDraft = useOnboardingStore((s) => s.organizationDraft);
  const locationDraft = useOnboardingStore((s) => s.locationDraft);
  const submitting = useOnboardingStore((s) => s.submitting);
  const error = useOnboardingStore((s) => s.error);

  const startWork = async () => {
    const ok = await useOnboardingStore.getState().finish();
    if (ok) {
      hapticSuccess();
      router.replace('/(tabs)');
    } else {
      hapticError();
    }
  };

  return (
    <OnboardingShell title="Всё готово" step="done" canBack={false}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: radii.pill,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
        }}
        accessibilityLabel="Настройка завершена"
      >
        <Check size={40} color={colors.primary} />
      </View>

      <Text variant="body" color="textSecondary" align="center">
        Контекст настроен. Переключить роль или организацию можно в любой момент
        через шапку приложения.
      </Text>

      <View
        style={{
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radii.md,
          backgroundColor: colors.surfaceMuted,
        }}
        accessibilityLabel="Сводка настройки"
      >
        <SummaryRow label="Роль" value={role ? ROLE_NAME[role] : '—'} />
        {organizationDraft ? (
          <SummaryRow label="Организация" value={organizationDraft.name} />
        ) : null}
        {locationDraft ? (
          <SummaryRow label="Точка" value={locationDraft.name} />
        ) : null}
      </View>

      {error ? (
        <Text variant="bodySmall" color="danger" align="center">
          {error}
        </Text>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={submitting}
        onPress={() => void startWork()}
      >
        Начать работу
      </Button>
    </OnboardingShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="bodySmall" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodySmall" style={{ textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}
