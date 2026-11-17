/**
 * DatePicker — выбор даты (Промт 12, Часть C).
 *
 * Триггер height 48 показывает дату «15.11.2026» (dd.mm.yyyy) и
 * открывает нижний шит с календарём: сетка 7×6 (неделя с
 * понедельника), кнопки дней 40×40 с зоной 48, текущий день —
 * кольцо primary, выбранный — заливка. Диапазон min/max —
 * недоступные дни приглушены. «Сегодня / Отмена / Применить»:
 * черновик применяется только по кнопке. A11y: role="button",
 * подпись с датой; у дней — aria-label с датой.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens';
import { Dialog } from '../Dialog';
import { Text } from '../Text';

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  label?: string;
  error?: string;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  testID?: string;
}

const DAY_SIZE = 40;
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

/** dd.mm.yyyy. */
export function formatDateRu(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}

/** Ключ дня для testID: yyyy-mm-dd. */
function dayKey(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Сетка 6 недель × 7 дней месяца (неделя с понедельника). */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  // getDay: Вс=0…Сб=6 → сдвиг к понедельнику.
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    cells.push(null);
    if (cells.length >= 42) break;
  }
  return cells;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isDisabledDay(day: Date, min?: Date, max?: Date): boolean {
  if (min && day < min) return true;
  if (max && day > max) return true;
  return false;
}

export function DatePicker({
  value,
  onChange,
  label,
  error,
  min,
  max,
  disabled = false,
  testID,
}: DatePickerProps) {
  const { colors, radii, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date | null>(value);
  const [viewYear, setViewYear] = useState(
    value ? value.getFullYear() : new Date().getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    value ? value.getMonth() : new Date().getMonth(),
  );

  // При повторном открытии — черновик и месяц от текущего значения.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация черновика при открытии шита
      setDraft(value);
      if (value) {
        setViewYear(value.getFullYear());
        setViewMonth(value.getMonth());
      }
    }
  }, [open, value]);

  const today = useMemo(() => new Date(), []);
  const grid = useMemo(
    () => monthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const shiftMonth = (delta: number) => {
    hapticSelection();
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const borderColor = error ? colors.danger : colors.border;

  return (
    <View testID={testID}>
      {label ? (
        <Text
          variant="bodySmall"
          color="textSecondary"
          style={{ marginBottom: spacing.sm }}
        >
          {label}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          label
            ? `${label}: ${value ? formatDateRu(value) : 'дата не выбрана'}`
            : value
              ? formatDateRu(value)
              : 'Выберите дату'
        }
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          hapticSelection();
          setOpen(true);
        }}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            height: 48,
            paddingHorizontal: spacing.md,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor,
            backgroundColor: colors.surface,
            opacity: disabled ? 0.5 : 1,
          },
          pressed && !disabled ? { opacity: 0.7 } : null,
        ]}
      >
        <CalendarDays size={18} color={colors.primary} />
        <Text
          variant="body"
          color={value ? 'text' : 'textMuted'}
          style={{ flex: 1 }}
          mono
        >
          {value ? formatDateRu(value) : 'ДД.ММ.ГГГГ'}
        </Text>
      </Pressable>

      {error ? (
        <Text
          variant="caption"
          color="danger"
          style={{ marginTop: spacing.sm }}
        >
          {error}
        </Text>
      ) : null}

      <Dialog visible={open} onClose={() => setOpen(false)} title="Выбор даты">
        <View style={{ gap: spacing.md }}>
          {/* Месяц и навигация. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Предыдущий месяц"
              onPress={() => shiftMonth(-1)}
              hitSlop={4}
              style={{
                width: 48,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={20} color={colors.textSecondary} />
            </Pressable>
            <Text variant="bodyStrong">
              {`${MONTHS[viewMonth]} ${viewYear}`}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Следующий месяц"
              onPress={() => shiftMonth(1)}
              hitSlop={4}
              style={{
                width: 48,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Дни недели. */}
          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((weekday) => (
              <View key={weekday} style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="micro" color="textMuted">
                  {weekday}
                </Text>
              </View>
            ))}
          </View>

          {/* Сетка 7×6. Ячейка — 1/7 ширины (как заголовки), виз.
              круг 40 внутри: фиксированные 40px при ширине шита ~358
              давали 8 колонок в ряд против 7 заголовков (баг
              VLM-аудита). Высота 44 — шит помещается целиком
              вместе с кнопками (VLM: «CTA ниже скролла»). */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {grid.map((day, index) => {
              const cell = (children: React.ReactNode, key: string) => (
                <View
                  key={key}
                  style={{
                    width: `${100 / 7}%`,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {children}
                </View>
              );
              if (!day) {
                return cell(null, `empty-${index}`);
              }
              const isSelected = draft ? sameDay(day, draft) : false;
              const isToday = sameDay(day, today);
              const dayDisabled = isDisabledDay(day, min, max);
              return cell(
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={formatDateRu(day)}
                  accessibilityState={{
                    selected: isSelected,
                    disabled: dayDisabled,
                  }}
                  disabled={dayDisabled}
                  onPress={() => {
                    hapticSelection();
                    setDraft(day);
                  }}
                  hitSlop={4}
                  testID={`day-${dayKey(day)}`}
                  style={{
                    width: DAY_SIZE,
                    height: DAY_SIZE,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 20,
                    borderWidth: isToday && !isSelected ? 2 : 0,
                    borderColor: colors.primary,
                    backgroundColor: isSelected
                      ? colors.primary
                      : 'transparent',
                    opacity: dayDisabled ? 0.35 : 1,
                  }}
                >
                  <Text
                    variant="body"
                    style={{
                      color: isSelected
                        ? colors.onPrimary
                        : dayDisabled
                          ? colors.textDisabled
                          : colors.text,
                    }}
                  >
                    {day.getDate()}
                  </Text>
                </Pressable>,
                dayKey(day),
              );
            })}
          </View>

          {/* Действия: Сегодня / Отмена / Применить. */}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              paddingTop: spacing.xs,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Сегодня"
              onPress={() => {
                hapticSelection();
                const now = new Date();
                setDraft(now);
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
              }}
              style={({ pressed }) => [
                {
                  height: 48,
                  paddingHorizontal: spacing.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.sm,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              testID="datepicker-today"
            >
              <Text variant="body" color="primaryText">
                Сегодня
              </Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Отмена"
              onPress={() => {
                hapticSelection();
                setOpen(false);
              }}
              style={({ pressed }) => [
                {
                  height: 48,
                  paddingHorizontal: spacing.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.sm,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              testID="datepicker-cancel"
            >
              <Text variant="body" color="textSecondary">
                Отмена
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Применить дату"
              disabled={!draft}
              onPress={() => {
                hapticSelection();
                if (draft) {
                  onChange(draft);
                  setOpen(false);
                }
              }}
              style={({ pressed }) => [
                {
                  height: 48,
                  paddingHorizontal: spacing.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.sm,
                  backgroundColor: draft ? colors.primary : colors.surfaceMuted,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              testID="datepicker-apply"
            >
              <Text
                variant="bodyStrong"
                style={{
                  color: draft ? colors.onPrimary : colors.textDisabled,
                }}
              >
                Применить
              </Text>
            </Pressable>
          </View>
        </View>
      </Dialog>
    </View>
  );
}
