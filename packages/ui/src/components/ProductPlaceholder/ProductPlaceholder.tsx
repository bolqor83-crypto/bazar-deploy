/**
 * ProductPlaceholder — заглушка фото товара (Промт 16, Часть A).
 *
 * Товар без фото получает силуэт продукции на приглушённом фоне:
 * узнаваемо, но подчеркнуто бледно (контраст ~1.5–2:1) —
 * «заглушка должна хотеться заменить». Единственный способ
 * сделать карточку «живой» — загрузить настоящее фото.
 *
 * Только презентация: ключ силуэта приходит извне (бизнес-слой
 * решает, potato это или crate), тема выбирает фон/заливку из
 * placeholderPalette. Это декоративное изображение, не контрол:
 * WCAG 1.4.11 (non-text contrast) не применяется — ADR 0016.
 *
 * showCameraBadge — кружок с камерой: только в кабинете
 * продавца, подсказка «добавьте фото». Покупатель видит
 * чистый силуэт без надписей «Нет фото».
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Camera } from 'lucide-react-native';
import { useTheme } from '../../theme';
import {
  placeholderPalette,
  SILHOUETTES,
  type SilhouetteKey,
} from '../../icons/silhouettes';

export interface ProductPlaceholderProps {
  /** Ключ силуэта; приходит из бизнес-слоя, UI не мапит. */
  silhouette: SilhouetteKey;
  /** Сторона квадрата (px) или 'fill' — на весь контейнер. */
  size?: number | 'fill';
  /** Кружок «добавьте фото» — только для кабинета продавца. */
  showCameraBadge?: boolean;
  /** Подпись для скринридера; умолчание «Фото товара отсутствует». */
  accessibilityLabel?: string;
  /** Стиль контейнера (радиус — на совести слота). */
  style?: StyleProp<ViewStyle>;
}

/** Доля размера силуэта от контейнера в режиме 'fill'. */
export const PLACEHOLDER_SHAPE_RATIO = 0.58;

export function ProductPlaceholder({
  silhouette,
  size = 'fill',
  showCameraBadge = false,
  accessibilityLabel = 'Фото товара отсутствует',
  style,
}: ProductPlaceholderProps) {
  const { isDark, colors } = useTheme();
  const bg = isDark ? placeholderPalette.bgDark : placeholderPalette.bgLight;
  const shape = isDark
    ? placeholderPalette.shapeDark
    : placeholderPalette.shapeLight;

  const Shape = SILHOUETTES[silhouette];
  const isFill = size === 'fill';
  const box = typeof size === 'number' ? size : undefined;
  // ~58% контейнера: силуэт не упирается в края «фотослота».
  const shapeSize =
    typeof size === 'number'
      ? Math.round(size * PLACEHOLDER_SHAPE_RATIO)
      : `${Math.round(PLACEHOLDER_SHAPE_RATIO * 100)}%`;

  return (
    <View
      testID="product-placeholder"
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        isFill
          ? { flex: 1, alignSelf: 'stretch' }
          : { width: box, height: box },
        style,
      ]}
    >
      <Shape size={shapeSize} color={shape} />
      {showCameraBadge ? (
        <View
          testID="product-placeholder-camera"
          accessible
          accessibilityRole="image"
          accessibilityLabel="Нет фото — добавьте"
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Camera size={16} color={colors.textSecondary} />
        </View>
      ) : null}
    </View>
  );
}
