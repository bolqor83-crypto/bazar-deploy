/**
 * Тесты logger (Промт 18, Часть A): ring-buffer, тост на error,
 * info только в dev, копирование буфера.
 */
import { useToastStore } from '@bazar/ui';
import { logger } from './logger';
import * as clipboard from './clipboard';

let copyMock: jest.SpyInstance;

describe('logger', () => {
  beforeEach(() => {
    logger.clear();
    logger.setContext({});
    useToastStore.setState({ queue: [] });
    // Spy пересоздаётся в каждом тесте: restoreAllMocks в afterEach
    // возвращает модулю оригинал, и старый указатель мимо вызовов.
    copyMock = jest
      .spyOn(clipboard, 'copyTextToClipboard')
      .mockResolvedValue(true);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('error: запись в буфер + тост с копированием лога', () => {
    logger.error('network.request', 'Сервер временно недоступен', {
      path: '/orders',
    });

    const buffer = logger.getBuffer();
    expect(buffer).toHaveLength(1);
    expect(buffer[0]).toBeTruthy();
    expect(buffer[0]!).toMatchObject({
      level: 'error',
      action: 'network.request',
      message: 'Сервер временно недоступен',
    });
    expect(buffer[0]?.timestamp).toBeTruthy();

    const queue = useToastStore.getState().queue;
    expect(queue).toHaveLength(1);
    expect(queue[0]!).toMatchObject({ variant: 'error', message: 'Ошибка' });
    expect(queue[0]?.action?.label).toBe('Скопировать лог');
  });

  it('warn: запись без тоста; info — в dev-сборке', () => {
    logger.warn('http.reject', 'Не найдено');
    expect(logger.getBuffer()).toHaveLength(1);
    expect(useToastStore.getState().queue).toHaveLength(0);

    // В тестах jest-expo __DEV__ = true — info пишется.
    logger.info('auth.login', 'Успешно');
    expect(logger.getBuffer()).toHaveLength(2);
    expect(logger.getBuffer()[1]?.level).toBe('info');
  });

  it('буфер ограничен 100 записями (старые вытесняются)', () => {
    for (let i = 0; i < 130; i += 1) {
      logger.warn('stress', `запись ${i}`);
    }
    const buffer = logger.getBuffer();
    expect(buffer).toHaveLength(100);
    expect(buffer[0]?.message).toBe('запись 30');
    expect(buffer[99]?.message).toBe('запись 129');
  });

  it('copyToClipboard: весь буфер одним JSON', async () => {
    logger.error('a', 'первая');
    logger.warn('b', 'вторая');
    await logger.copyToClipboard();

    expect(copyMock).toHaveBeenCalledTimes(1);
    const payload = copyMock.mock.calls[0]?.[0];
    const parsed = JSON.parse(payload ?? '') as ReturnType<
      typeof logger.getBuffer
    >;
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ level: 'error', action: 'a' });
    expect(parsed[1]).toMatchObject({ level: 'warn', action: 'b' });
  });

  it('setContext: userId и screen проставляются записям', () => {
    logger.setContext({ userId: 'user-1', screen: 'orders' });
    logger.warn('check', 'контекст');
    const entry = logger.getBuffer()[0]!;
    expect(entry.userId).toBe('user-1');
    expect(entry.screen).toBe('orders');
  });

  it('clear: буфер пустеет', () => {
    logger.warn('one', 'раз');
    logger.clear();
    expect(logger.getBuffer()).toHaveLength(0);
  });
});
