/**
 * ErrorBoundary — перехват необработанных исключений React
 * (Промт 18, Часть A).
 *
 * Логирует падение через logger.error (тост с копированием лога)
 * и показывает спокойный fallback: ErrorState с перезагрузкой
 * экрана. Никакого красного и технического текста пользователю.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';
import { ErrorState, Text, useTheme } from '@bazar/ui';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('react.unhandled', error.message, {
      stack: info.componentStack?.slice(0, 2000),
    });
  }

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return <ErrorBoundaryFallback />;
  }
}

/** Спокойный экран ошибки с перезагрузкой. */
function ErrorBoundaryFallback() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
      }}
    >
      <ErrorState
        title="Что-то пошло не так"
        description="Экран упал с ошибкой. Попробуйте перезагрузить — данные не потеряны."
        onRetry={() => window.location.reload()}
        retryLabel="Перезагрузить"
      />
      <Text variant="caption" color="textMuted">
        Детали — в журнале: /dev/logs
      </Text>
    </View>
  );
}
