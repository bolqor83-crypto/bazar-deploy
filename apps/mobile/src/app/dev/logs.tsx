/**
 * /dev/logs — маршрут журнала клиентских логов (Промт 18, Часть A).
 *
 * Доступен во всех сборках (в отличие от /dev/design): не содержит
 * секретов и нужен для диагностики на проде — прямой URL без ссылок
 * из навигации. info-записи появляются только в dev-сборках.
 */
import { DevLogsRoute } from '../../components/screens/DevLogsScreen';

export default function DevLogs() {
  return <DevLogsRoute />;
}
