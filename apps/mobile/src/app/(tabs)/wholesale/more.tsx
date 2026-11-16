/**
 * «Все инструменты» оптовика (Промт 12, Часть D).
 *
 * Полноэкранный экран вместо шита «Ещё»: группы разделов, поиск
 * по названию, бейджи ожидающих действий. Общая реализация —
 * components/shell/ToolsScreen.
 */
import { ToolsScreen } from '../../../components/shell/ToolsScreen';

export default function WholesaleMoreScreen() {
  return <ToolsScreen role="wholesale_seller" />;
}
