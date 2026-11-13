/**
 * DeliveryTimeline — лента жизненного цикла доставки (Промт 10,
 * Часть D).
 *
 * Заявка → принята → забрана → в пути → доставлена → завершена
 * (или отменена). Достигнутые шаги — заполненные маркеры
 * брендового цвета, будущие — контурные. Отмена — терракотовый
 * маркер. Только презентация.
 */
import { View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import type { DeliveryStatus } from '@bazar/types';
import { useTheme } from '../../theme';
import { Text } from '../Text';

const ACTIVE_STEPS = [
  {
    key: 'PENDING',
    label: 'Заявка создана',
    statuses: [
      'PENDING',
      'ACCEPTED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
      'COMPLETED',
    ],
  },
  {
    key: 'ACCEPTED',
    label: 'Перевозчик принял',
    statuses: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'],
  },
  {
    key: 'PICKED_UP',
    label: 'Забрал груз',
    statuses: ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'],
  },
  {
    key: 'IN_TRANSIT',
    label: 'В пути',
    statuses: ['IN_TRANSIT', 'DELIVERED', 'COMPLETED'],
  },
  {
    key: 'DELIVERED',
    label: 'Доставил',
    statuses: ['DELIVERED', 'COMPLETED'],
  },
  { key: 'COMPLETED', label: 'Завершена', statuses: ['COMPLETED'] },
] as const;

export interface DeliveryTimelineProps {
  status: DeliveryStatus;
  testID?: string;
}

export function DeliveryTimeline({ status, testID }: DeliveryTimelineProps) {
  const { colors, spacing } = useTheme();
  const cancelled = status === 'CANCELLED';
  const steps = cancelled
    ? [
        ...ACTIVE_STEPS.slice(0, 1).map((s) => ({ ...s, done: true })),
        { key: 'CANCELLED', label: 'Отменена', statuses: [], done: true },
      ]
    : ACTIVE_STEPS.map((s) => ({
        ...s,
        done: (s.statuses as readonly string[]).includes(status),
      }));

  return (
    <View
      testID={testID}
      accessibilityLabel="История доставки"
      style={{ gap: 0 }}
    >
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const isCancel = step.key === 'CANCELLED';
        return (
          <View
            key={step.key}
            style={{ flexDirection: 'row', gap: spacing.md }}
          >
            <View style={{ alignItems: 'center', width: 24 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isCancel
                    ? colors.danger
                    : step.done
                      ? colors.primary
                      : colors.border,
                  backgroundColor: step.done
                    ? isCancel
                      ? colors.danger
                      : colors.primary
                    : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {step.done ? (
                  isCancel ? (
                    <X size={14} color={colors.surface} />
                  ) : (
                    <Check size={14} color={colors.surface} />
                  )
                ) : null}
              </View>
              {!last ? (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 24,
                    backgroundColor:
                      step.done && !isCancel ? colors.primary : colors.border,
                  }}
                />
              ) : null}
            </View>
            <View
              style={{ paddingBottom: last ? 0 : spacing.md, paddingTop: 1 }}
            >
              <Text
                variant="bodySmall"
                color={step.done ? 'text' : 'textSecondary'}
                style={
                  step.done ? { fontFamily: 'Inter_600SemiBold' } : undefined
                }
              >
                {step.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
