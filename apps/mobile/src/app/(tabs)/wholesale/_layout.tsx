/**
 * Ролевая группа wholesale: RoleGuard.
 *
 * Прямой доступ по URL к экранам чужой роли закрыт — редирект на
 * первый экран активной роли пользователя.
 */
import { Stack } from 'expo-router';
import { useTheme } from '@bazar/ui';
import { RoleGuard } from '../../../components/guards/RoleGuard';

export default function WholesaleLayout() {
  const { colors } = useTheme();

  return (
    <RoleGuard allowedRoles={['wholesale_seller']}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </RoleGuard>
  );
}
