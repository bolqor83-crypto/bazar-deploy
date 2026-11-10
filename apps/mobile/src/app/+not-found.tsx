/**
 * 404: экран «не найдено». Спокойный текст и кнопка на главную.
 */
import { useRouter } from 'expo-router';
import { Compass } from 'lucide-react-native';
import { EmptyState, useTheme } from '@bazar/ui';
import { View } from 'react-native';
import { useContextStore } from '../stores/contextStore';
import { firstRouteFor } from '../components/shell/navigation';

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const role = useContextStore((s) => s.active.role);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
      <EmptyState
        icon={Compass}
        title="Страница не найдена"
        description="Возможно, ссылка устарела или раздел ещё не открыли."
        action={{
          label: 'На главную',
          onPress: () => {
            router.replace(firstRouteFor(role));
          },
        }}
      />
    </View>
  );
}
