/**
 * SearchBar — поле поиска каталога.
 *
 * Высота 48 (рамка вместо тени), compact — 40 для строки фильтров
 * рабочих списков (Промт 12, Часть A). Иконка-лупа слева, кнопка
 * очистки появляется только с текстом (цель ≥48×48 через hitSlop).
 * Ввод отправляется по кнопке «Готово» на клавиатуре.
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
  /** Компактная строка (36) для строки фильтров. */
  compact?: boolean;
  /** Подпись доступности (контекст поля). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Поиск',
  onSubmit,
  autoFocus = false,
  compact = false,
  accessibilityLabel = 'Поиск по каталогу',
  style,
  testID,
}: SearchBarProps) {
  const { colors, radii, spacing } = useTheme();

  const height = compact ? 40 : 48;

  return (
    <View
      style={[
        {
          height,
          flexDirection: 'row',
          alignItems: 'center',
          gap: compact ? 6 : spacing.sm,
          paddingHorizontal: compact ? spacing.sm : spacing.md,
          backgroundColor: colors.surface,
          borderRadius: compact ? radii.sm : radii.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Search size={compact ? 16 : 20} color={colors.textMuted} />
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
        accessibilityLabel={accessibilityLabel}
        style={{
          flex: 1,
          minHeight: height,
          color: colors.text,
          fontSize: compact ? 15 : 17,
          fontFamily: 'Inter_400Regular',
          paddingVertical: 0,
          paddingHorizontal: 0,
          // Веб-фокус-рамка браузера (оранжевый аутлайн) запрещена:
          // фокус показывает рамка контейнера.
          outlineWidth: 0,
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
            width: compact ? 28 : 32,
            height,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={compact ? 16 : 18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
