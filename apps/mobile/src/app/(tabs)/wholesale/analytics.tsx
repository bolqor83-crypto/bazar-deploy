/**
 * Аналитика (analytics) — экран оптовика (Промт 18, Часть D):
 * AI Layer 1, дашборд на данных Layer 0 (ADR 0019).
 */
import { AnalyticsScreen } from '../../../components/screens/AnalyticsScreen';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function AnalyticsRoute() {
  return (
    <RoleScreen role="wholesale_seller" section="analytics" title="Аналитика">
      <AnalyticsScreen />
    </RoleScreen>
  );
}
