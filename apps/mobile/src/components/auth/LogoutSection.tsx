/**
 * LogoutSection — профиль пользователя и выход из аккаунта.
 *
 * Визуальный аудит Промта 8 (Часть A) переработал экран:
 * - карточка пользователя с аватаром-инициалами;
 * - карточка «Контекст работы»: роль, организация, точка — видно,
 *   в каком контексте работает приложение;
 * - «Переключить контекст» — явная кнопка (открывает шит);
 * - выход — спокойная текстовая кнопка терракотой (не кричащий
 *   блок): деструктивное действие вторично и подтверждается в диалоге.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Building2, Briefcase, LogOut, MapPin } from 'lucide-react-native';
import {
  Button,
  Card,
  Dialog,
  Divider,
  Text,
  hapticSuccess,
  useTheme,
} from '@bazar/ui';
import { useAuth } from '../../hooks/useAuth';
import { useContextStore } from '../../stores/contextStore';
import { useContextSheetStore } from '../../stores/contextSheetStore';
import { ROLE_LABEL } from '../shell/navigation';

/** Инициалы для аватара: «Иван Петров» → «ИП». */
export function initialsOfName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '—';
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Строка карточки контекста: иконка, подпись, значение. */
function ContextRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 48,
      }}
    >
      <Icon size={20} color={colors.textSecondary} />
      <Text variant="bodySmall" color="textSecondary" style={{ width: 110 }}>
        {label}
      </Text>
      <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function LogoutSection() {
  const { colors, radii, spacing } = useTheme();
  const { user, logout } = useAuth();
  const active = useContextStore((s) => s.active);
  const organizations = useContextStore((s) => s.organizations);
  const locations = useContextStore((s) => s.locations);
  const openSheet = useContextSheetStore((s) => s.open);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const organizationName =
    organizations.find((o) => o.id === active.organizationId)?.name ??
    'Без организации';
  const locationName =
    locations.find((l) => l.id === active.locationId)?.name ?? '—';

  const confirmLogout = async () => {
    setBusy(true);
    await logout();
    setBusy(false);
    setConfirmVisible(false);
    hapticSuccess();
    router.replace('/login');
  };

  return (
    <View style={{ padding: spacing.lg, gap: spacing.lg }}>
      <Card>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="h3" color="primaryText">
              {initialsOfName(user?.name ?? '')}
            </Text>
          </View>
          <View style={{ gap: 2, flexShrink: 1 }}>
            <Text variant="h3" numberOfLines={1}>
              {user?.name ?? 'Гость'}
            </Text>
            <Text variant="bodySmall" color="textSecondary">
              {user?.phone ?? 'Телефон скрыт'}
            </Text>
          </View>
        </View>

        <Divider inset="sm" />

        <View style={{ gap: spacing.xs }}>
          <Text variant="caption" color="textMuted">
            Контекст работы
          </Text>
          <ContextRow
            icon={Briefcase}
            label="Роль"
            value={ROLE_LABEL[active.role]}
          />
          <ContextRow
            icon={Building2}
            label="Организация"
            value={organizationName}
          />
          <ContextRow icon={MapPin} label="Точка" value={locationName} />
        </View>
      </Card>

      <Button
        variant="secondary"
        size="lg"
        fullWidth
        onPress={openSheet}
        testID="switch-context"
      >
        Переключить контекст
      </Button>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Выйти из аккаунта"
        disabled={busy}
        hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        onPress={() => setConfirmVisible(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          minHeight: 48,
          borderRadius: radii.sm,
        }}
      >
        <LogOut size={18} color={colors.danger} />
        <Text variant="body" style={{ color: colors.danger }}>
          Выйти из аккаунта
        </Text>
      </Pressable>

      <Dialog
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        title="Выйти из аккаунта?"
      >
        <Text
          variant="body"
          color="textSecondary"
          style={{ marginBottom: spacing.lg }}
        >
          Вы сможете войти снова с тем же номером и паролем.
        </Text>
        <View style={{ gap: spacing.md }}>
          <Button
            variant="destructive"
            size="lg"
            fullWidth
            disabled={busy}
            onPress={() => void confirmLogout()}
          >
            Выйти
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={busy}
            onPress={() => setConfirmVisible(false)}
          >
            Отмена
          </Button>
        </View>
      </Dialog>
    </View>
  );
}
