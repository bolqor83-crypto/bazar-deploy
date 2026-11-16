/**
 * «Все инструменты» владельца точки (Промт 12, Часть D).
 *
 * Полноэкранный экран вместо шита «Ещё»: группы разделов и поиск.
 * Общая реализация — components/shell/ToolsScreen.
 */
import { ToolsScreen } from '../../../components/shell/ToolsScreen';

export default function StoreMoreScreen() {
  return <ToolsScreen role="store_owner" />;
}
