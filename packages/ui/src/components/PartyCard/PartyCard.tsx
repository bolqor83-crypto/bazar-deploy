/**
 * PartyCard — карточка контрагента (оптовик, точка, перевозчик).
 *
 * Аватар с инициалами (первые буквы двух слов названия), рейтинг
 * со звездой, галочка BadgeCheck для верифицированных. Только
 * презентация.
 */
import { View } from 'react-native';
import { BadgeCheck, Star } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Card } from '../Card';
import { Text } from '../Text';

export interface PartyCardProps {
  name: string;
  /** Инициалы аватара; по умолчанию — первые буквы двух слов. */
  initials?: string;
  /** Рейтинг 0–5; не показывается, если не задан. */
  rating?: number | null;
  /** Признак верифицированного контрагента. */
  verified?: boolean;
  /** Подпись под названием: «Оптовый продавец», «Перевозчик». */
  subtitle?: string;
  onPress?: () => void;
}

/** Инициалы: первые буквы до двух первых слов названия. */
export function initialsOf(name: string): string {
  // Срезаем ведущие не-буквы (кавычки в «Сеть «У дома»») и берём
  // первые буквы двух первых значимых слов.
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}]+/u, ''))
    .filter((word) => word.length > 0);
  if (words.length === 0) {
    return '';
  }
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/** Рейтинг по-русски: запятая как десятичный разделитель. */
function formatRating(rating: number): string {
  return rating.toFixed(1).replace('.', ',');
}

export function PartyCard({
  name,
  initials,
  rating = null,
  verified = false,
  subtitle,
  onPress,
}: PartyCardProps) {
  const { colors, radii, spacing } = useTheme();

  const body = (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radii.pill,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={`Аватар: ${name}`}
      >
        <Text variant="body" color="primaryText">
          {initials ?? initialsOf(name)}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="body" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </Text>
          {verified ? <BadgeCheck size={18} color={colors.info} /> : null}
        </View>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {rating !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Star size={14} color={colors.accent} />
            <Text variant="caption" mono color="textSecondary">
              {formatRating(rating)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return <Card onPress={onPress}>{body}</Card>;
  }
  return <Card>{body}</Card>;
}
