/**
 * SearchBar — поле поиска каталога.
 *
 * Высота 48, рамка вместо тени. Иконка-лупа слева, кнопка очистки
 * появляется только с текстом (цель 48×48 через hitSlop). Ввод
 * отправляется по кнопке «Готово» на клавиатуре.
 */
import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Отправка запроса (кнопка «Готово» на клавиатуре). */
  onSubmit?: () => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Поиск',
  onSubmit,
  autoFocus = false,
  style,
  testID,
}: SearchBarProps) {
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={[
        {
          height: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Search size={20} color={colors.textMuted} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        accessibilityLabel="Поиск по каталогу"
        style={{
          flex: 1,
          minHeight: 48,
          color: colors.text,
          fontSize: 17,
          fontFamily: 'Inter_400Regular',
          paddingVertical: 0,
          paddingHorizontal: 0,
        }}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Очистить поиск"
          hitSlop={12}
          onPress={() => {
            hapticSelection();
            onChangeText('');
          }}
          style={{
            width: 32,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
