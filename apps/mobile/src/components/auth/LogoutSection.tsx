/**
 * LogoutSection — карточка пользователя и выход из аккаунта.
 *
 * Используется на экранах «Профиль» всех четырёх ролей. Кнопка
 * разрушающая (терракота), выход — только после подтверждения
 * в нижнем шите.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Dialog, Text, hapticSuccess, useTheme } from '@bazar/ui';
import { useAuth } from '../../hooks/useAuth';

export function LogoutSection() {
  const { spacing } = useTheme();
  const { user, logout } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [busy, setBusy] = useState(false);

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
        <View style={{ gap: spacing.xs }}>
          <Text variant="h3">{user?.name ?? 'Гость'}</Text>
          <Text variant="bodySmall" color="textSecondary">
            {user?.phone ?? 'Телефон скрыт'}
          </Text>
        </View>
      </Card>

      <Text variant="caption" color="textMuted" align="center">
        Управление организациями и точками появится после подключения API.
      </Text>

      <Button
        variant="destructive"
        size="lg"
        fullWidth
        onPress={() => setConfirmVisible(true)}
      >
        Выйти из аккаунта
      </Button>

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
