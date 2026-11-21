/**
 * Тесты экрана журнала /dev/logs (Промт 18, Часть A): рендер буфера,
 * очистка, копирование, пустое состояние.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { DevLogsScreen } from '../components/screens/DevLogsScreen';
import { logger } from '../utils/logger';
import * as clipboard from '../utils/clipboard';
import * as client from '../services/api/client';

let copyMock: jest.SpyInstance;
let pingMock: jest.SpyInstance;

describe('DevLogsScreen', () => {
  beforeEach(() => {
    logger.clear();
    logger.setContext({});
    // Spy пересоздаётся в каждом тесте (см. logger.test.ts).
    copyMock = jest
      .spyOn(clipboard, 'copyTextToClipboard')
      .mockResolvedValue(true);
    pingMock = jest.spyOn(client, 'pingApi').mockResolvedValue(true);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('рендерит записи буфера: новые сверху, action и message видны', async () => {
    logger.warn('first.action', 'Старая запись');
    logger.warn('second.action', 'Новая запись');

    const screen = await render(<DevLogsScreen />);

    expect(screen.getByText('Журнал')).toBeTruthy();
    expect(screen.getByText(/2 предупреждения/)).toBeTruthy();
    expect(screen.getByText('second.action')).toBeTruthy();
    expect(screen.getByText('first.action')).toBeTruthy();
    expect(screen.getByText('Новая запись')).toBeTruthy();
    expect(screen.getByText('Старая запись')).toBeTruthy();
  });

  it('«Очистить» пустит список и покажет пустое состояние', async () => {
    logger.error('boom.action', 'Ошибка запроса');
    const screen = await render(<DevLogsScreen />);

    fireEvent.press(screen.getByTestId('logs-clear'));

    expect(
      await screen.findByText(
        'Журнал пуст. Записи появляются при ошибках и предупреждениях.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('boom.action')).toBeNull();
  });

  it('«Скопировать всё» копирует JSON буфера', async () => {
    logger.warn('copy.action', 'для копирования');
    const screen = await render(<DevLogsScreen />);

    fireEvent.press(screen.getByTestId('logs-copy'));

    expect(copyMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(copyMock.mock.calls[0][0]);
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({ action: 'copy.action' });
  });

  it('пустой буфер — подсказка без записей', async () => {
    const screen = await render(<DevLogsScreen />);
    expect(
      screen.getByText(
        'Журнал пуст. Записи появляются при ошибках и предупреждениях.',
      ),
    ).toBeTruthy();
    expect(screen.queryAllByTestId(/^logs-entry-/)).toHaveLength(0);
  });

  it('«Проверка связи»: сбой пишет error в буфер', async () => {
    pingMock.mockResolvedValue(false);
    const screen = await render(<DevLogsScreen />);

    fireEvent.press(screen.getByTestId('logs-probe'));

    await waitFor(() => {
      expect(screen.getAllByTestId(/^logs-entry-/)).toHaveLength(1);
    });
    expect(screen.getByText('ERROR')).toBeTruthy();
    expect(screen.getByText('Сервер не отвечает')).toBeTruthy();
    expect(screen.getByText(/1 ошибка/)).toBeTruthy();
  });

  it('«Проверка связи»: успех — info-запись в dev-сборке', async () => {
    pingMock.mockResolvedValue(true);
    const screen = await render(<DevLogsScreen />);

    fireEvent.press(screen.getByTestId('logs-probe'));

    await waitFor(() => {
      expect(screen.getAllByTestId(/^logs-entry-/)).toHaveLength(1);
    });
    expect(screen.getByText('INFO')).toBeTruthy();
    expect(screen.getByText(/0 ошибок/)).toBeTruthy();
  });
});
