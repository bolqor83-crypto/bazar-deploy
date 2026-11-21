/**
 * Экран журнала логов (Промт 18, Часть A + D).
 *
 * Показывает ring-buffer логгера (последние 100 записей, новые
 * сверху): уровень, время, действие, сообщение, контекст. Кнопки:
 * «Очистить», «Скопировать всё» и «Проверка связи» — пингует
 * /api/health через клиент приложения: сбой пишется в журнал как
 * error (тост с копированием) — им же снимается golden-кадр.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { ArrowLeft, ClipboardCopy, Eraser, Wifi } from 'lucide-react-native';
import { Badge, Button, Text, useTheme, useToast } from '@bazar/ui';
import { logger, type LogEntry } from '../../utils/logger';
import { copyTextToClipboard } from '../../utils/clipboard';
import { pingApi } from '../../services/api/client';

/** Цвет уровня: terracotta для error (не красный), янтарь для warn. */
function levelBadge(entry: LogEntry): {
  label: string;
  variant: 'danger' | 'warning' | 'neutral';
} {
  if (entry.level === 'error') {
    return { label: 'ERROR', variant: 'danger' };
  }
  if (entry.level === 'warn') {
    return { label: 'WARN', variant: 'warning' };
  }
  return { label: 'INFO', variant: 'neutral' };
}

/** Время записи ЧЧ:ММ:СС (локальное). */
function entryTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Русская плюрализация: 1 ошибка / 2 ошибки / 5 ошибок. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) {
    return many;
  }
  if (mod10 === 1) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return few;
  }
  return many;
}

export function DevLogsScreen() {
  const { colors, spacing, radii } = useTheme();
  const router = useRouter();
  const toast = useToast();
  // Счётчик для перерисовки после очистки буфера.
  const [version, setVersion] = useState(0);

  const entries = useMemo(() => {
    void version;
    return [...logger.getBuffer()].reverse();
  }, [version]);

  const counts = useMemo(() => {
    void version;
    const all = logger.getBuffer();
    return {
      error: all.filter((e) => e.level === 'error').length,
      warn: all.filter((e) => e.level === 'warn').length,
      info: all.filter((e) => e.level === 'info').length,
    };
  }, [version]);

  const handleClear = () => {
    logger.clear();
    setVersion((v) => v + 1);
  };

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(
      JSON.stringify(logger.getBuffer(), null, 2),
    );
    toast.show({
      variant: ok ? 'success' : 'error',
      message: ok ? 'Журнал скопирован' : 'Не удалось скопировать',
    });
  };

  const handleProbe = async () => {
    const ok = await pingApi();
    if (ok) {
      logger.info('network.health', 'Связь с сервером есть');
      toast.show({ variant: 'success', message: 'Связь есть' });
    } else {
      // pingApi глотает сбой (булев контракт) — фиксируем в журнале.
      logger.error('network.health', 'Сервер не отвечает');
    }
    setVersion((v) => v + 1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: spacing.xxxl,
          gap: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Назад"
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: -spacing.md,
            }}
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="h2">Журнал</Text>
            <Text variant="caption" color="textMuted">
              {`${counts.error} ${plural(counts.error, 'ошибка', 'ошибки', 'ошибок')} · ` +
                `${counts.warn} ${plural(counts.warn, 'предупреждение', 'предупреждения', 'предупреждений')} · ` +
                `${counts.info} info`}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            icon={Eraser}
            onPress={handleClear}
            testID="logs-clear"
          >
            Очистить
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={ClipboardCopy}
            onPress={() => {
              void handleCopy();
            }}
            testID="logs-copy"
          >
            Скопировать всё
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Wifi}
            onPress={() => {
              void handleProbe();
            }}
            testID="logs-probe"
          >
            Проверка связи
          </Button>
        </View>

        {entries.length === 0 ? (
          <Text
            variant="body"
            color="textSecondary"
            style={{ marginTop: spacing.lg }}
          >
            Журнал пуст. Записи появляются при ошибках и предупреждениях.
          </Text>
        ) : (
          entries.map((entry, index) => {
            const badge = levelBadge(entry);
            return (
              <View
                key={`${entry.timestamp}-${entry.action}-${index}`}
                testID={`logs-entry-${index}`}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  gap: spacing.xs,
                  backgroundColor: colors.backgroundElevated,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <Text
                    variant="caption"
                    color="textMuted"
                    mono
                    testID="logs-time"
                  >
                    {entryTime(entry.timestamp)}
                  </Text>
                  <Text
                    variant="caption"
                    color="textSecondary"
                    mono
                    style={{ flex: 1 }}
                    numberOfLines={1}
                  >
                    {entry.action}
                  </Text>
                </View>
                <Text variant="bodySmall">{entry.message}</Text>
                {entry.context ? (
                  <Text
                    variant="caption"
                    color="textMuted"
                    mono
                    numberOfLines={3}
                  >
                    {JSON.stringify(entry.context)}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

/** Обёртка роута: тост рендерит корневой BazarUIProvider (одна карточка). */
export function DevLogsRoute() {
  return <DevLogsScreen />;
}
