/**
 * OrderTimeline — лента жизненного цикла заказа (Промт 9, Часть E).
 *
 * Вертикальная ось: создан → подтверждён → готов → завершён
 * (или отменён). Достигнутые шаги — заполненные маркеры
 * брендового цвета, будущие — контурные. Отмена рисует
 * терракотовый маркер и останавливает ось. Только презентация.
 */
import { View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import type { OrderStatus } from '@bazar/types';
import { useTheme } from '../../theme';
import { Text } from '../Text';

/** Шаги оси для активного заказа. */
const ACTIVE_STEPS = [
  {
    key: 'CREATED',
    label: 'Создан',
    statuses: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'],
  },
  {
    key: 'CONFIRMED',
    label: 'Подтверждён',
    statuses: ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'],
  },
  { key: 'READY', label: 'Готов', statuses: ['READY', 'COMPLETED'] },
  { key: 'COMPLETED', label: 'Завершён', statuses: ['COMPLETED'] },
] as const;

export interface OrderTimelineProps {
  status: OrderStatus;
  testID?: string;
}

export function OrderTimeline({ status, testID }: OrderTimelineProps) {
  const { colors, spacing } = useTheme();
  const cancelled = status === 'CANCELLED';
  const steps = cancelled
    ? [
        ...ACTIVE_STEPS.slice(0, 1).map((s) => ({ ...s, done: true })),
        { key: 'CANCELLED', label: 'Отменён', statuses: [], done: true },
      ]
    : ACTIVE_STEPS.map((s) => ({
        ...s,
        done: (s.statuses as readonly string[]).includes(status),
      }));

  return (
    <View
      testID={testID}
      accessibilityLabel="История заказа"
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
