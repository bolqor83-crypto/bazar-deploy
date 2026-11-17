/**
 * ProductGallery — галерея товара.
 *
 * Горизонтальная постраничная карусель: реальные фото (Image,
 * cover) с фолбэком на плашку-заглушку (тон детерминирован
 * индексом), точки-индикаторы снизу. Листается свайпом; активный
 * кадр вычисляется по смещению скролла. URL приходят готовыми
 * (абсолютными) — экран вызывает resolveMediaUrl (Промт 12,
 * итерация 3: реальные фото вместо заглушек-иконок).
 */
import { useMemo, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ImagePlus } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { placeholderTone } from '../../tokens/placeholder';

export interface ProductGalleryProps {
  /** URL картинок; длина задаёт число кадров. */
  images: string[];
  /** Ширина кадра, обязательна для постраничного скролла. */
  slideWidth: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ProductGallery({
  images,
  slideWidth,
  height = 220,
  style,
  testID,
}: ProductGalleryProps) {
  const { colors, radii, spacing } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  // Индексы кадров, чьё фото не загрузилось, — показываем заглушку.
  const [failed, setFailed] = useState<Set<number>>(new Set());

  const slides = useMemo(() => (images.length > 0 ? images : [null]), [images]);
  const markFailed = (index: number) =>
    setFailed((prev) => {
      if (prev.has(index)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(index);
      return next;
    });

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    if (next !== activeIndex && next >= 0 && next < slides.length) {
      setActiveIndex(next);
    }
  };

  return (
    <View style={style} testID={testID} accessibilityLabel="Галерея товара">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={64}
        style={{ borderRadius: radii.lg }}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {slides.map((url, index) => (
          <View
            key={index}
            style={{
              width: slideWidth,
              height,
              borderRadius: radii.lg,
              backgroundColor: placeholderTone(index),
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
            accessible
            accessibilityLabel={`Фото ${index + 1} из ${slides.length}`}
          >
            {url && !failed.has(index) ? (
              <Image
                source={{ uri: url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                onError={() => markFailed(index)}
              />
            ) : (
              <ImagePlus size={40} color={colors.textMuted} />
            )}
          </View>
        ))}
      </ScrollView>

      {slides.length > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.xs + 2,
            marginTop: spacing.sm,
          }}
        >
          {slides.map((_, index) => (
            <View
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  index === activeIndex ? colors.primary : colors.borderStrong,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
