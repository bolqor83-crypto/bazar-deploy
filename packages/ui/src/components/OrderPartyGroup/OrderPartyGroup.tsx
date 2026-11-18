/**
 * OrderPartyGroup — группа заказов одного контрагента
 * (Промт 15, Часть E).
 *
 * Заголовок 64px: аватар-инициалы 32, имя h3, мета caption
 * табличными цифрами «3 заказа · 12 400 ₽», компактный чип
 * «1 активный» (accent) при активных заказах, шеврон справа.
 * Весь заголовок — кнопка (зона ≥ 48×48, hitSlop добирает).
 * Развёрнутая группа показывает children (OrderCard'ы) с gap md.
 * Анимация сворачивания — 180ms ease (motion-токены), без
 * спиннеров. Только презентация: данные приходят пропсами.
 *
 * Группировка — представление: в БД заказы не сливаются (Промт 9).
 */
import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { formatPrice } from '../PriceDisplay';
import { Text } from '../Text';
import { initialsOf } from '../PartyCard';

/** Русская плюрализация числа заказов («1 заказ / 2 заказа»). */
function pluralOrders(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'заказ';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'заказа';
  }
  return 'заказов';
}

/** Русская плюрализация активных («1 активный / 2 активных»). */
function pluralActive(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'активный';
  return 'активных';
}

export interface OrderPartyGroupProps {
  /** Контрагент: продавец (вид покупателя) или покупатель. */
  party: { id: string; name: string };
  /** Всего заказов в группе. */
  count: number;
  /** Активные заказы (PENDING/CONFIRMED/PREPARING/READY). */
  activeCount: number;
  /** Сумма total без отменённых, копейки. */
  totalSum: number;
  expanded: boolean;
  onToggle: () => void;
  /** OrderCard'ы группы — видны только в развёрнутом состоянии.
   * Необязательные: свёрнутый заголовок рендерится и без карточек
   * (например, пока данные фильтруются). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function OrderPartyGroup({
  party,
  count,
  activeCount,
  totalSum,
  expanded,
  onToggle,
  children,
  style,
  testID,
}: OrderPartyGroupProps) {
  const { colors, radii, spacing, isDark } = useTheme();

  // 180ms ease — существующие motion-токены проекта.
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(expanded ? '180deg' : '0deg', {
          duration: 180,
        }),
      },
    ],
  }));

  const toggleLabel = `${party.name}, ${count} ${pluralOrders(count)}, ${
    expanded ? 'свернуть' : 'развернуть'
  }`;

  return (
    <View style={style} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={toggleLabel}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
        testID={testID ? `${testID}-header` : undefined}
        style={({ pressed }) => [
          {
            minHeight: 64,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.md,
            borderRadius: radii.md,
            backgroundColor: colors.surface,
            // Группа — часть списка: рамка вместо тени (правило 14b
            // «форма/сводка = outlined», в dark — граница).
            borderWidth: 1,
            borderColor: isDark ? colors.border : colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {/* Аватар-инициалы (механизм PartyCard), компактный 32. */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radii.pill,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel={`Аватар: ${party.name}`}
        >
          <Text variant="caption" color="primaryText">
            {initialsOf(party.name)}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h3" numberOfLines={1}>
            {party.name}
          </Text>
          <Text variant="caption" color="textSecondary" mono>
            {`${count} ${pluralOrders(count)} · ${formatPrice(totalSum)}`}
          </Text>
        </View>

        {activeCount > 0 ? (
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              borderRadius: radii.pill,
              backgroundColor: colors.accentSoft,
            }}
            accessibilityLabel={`${activeCount} ${pluralActive(activeCount)}`}
          >
            <Text variant="micro" style={{ color: colors.accentText }}>
              {`${activeCount} ${pluralActive(activeCount)}`}
            </Text>
          </View>
        ) : null}

        <Animated.View style={chevronStyle}>
          <ChevronDown size={20} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {expanded ? (
        <View style={{ paddingTop: spacing.md, gap: spacing.md }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
