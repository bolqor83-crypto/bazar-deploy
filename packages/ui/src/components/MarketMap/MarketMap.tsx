/**
 * MarketMap — схема рынка с маршрутом (Промт 17, Часть B).
 *
 * Чистая схема в духе карты метро: ряды — горизонтальные полосы
 * surfaceMuted, точки маршрута — пронумерованные кружки primary,
 * линия маршрута — primary width 3 со скруглёнными соединениями,
 * обратная ветка к выходу — пунктир. Вход — маркер у нижнего края
 * с подписью «Вход». Visited-точки — success с чеком, следующая
 * непройденная — обводка accent.
 *
 * Только презентация: порядок и метры приходят извне (экран
 * считает их ответом API). Основной доступный контент — список
 * остановок под схемой; сама схема — role="image" с итоговой
 * подписью (a11yLabel передаёт экран).
 */
import { View } from 'react-native';
import {
  Svg,
  Circle,
  G,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../theme';
import { Text } from '../Text';

/** Точка маршрута на схеме. */
export interface MarketMapStop {
  row: number;
  spot: number;
  /** Номер остановки в порядке обхода (с 1). */
  index: number;
  visited: boolean;
}

export interface MarketMapProps {
  rows: number;
  spots: number;
  entrance: { row: number; spot: number };
  stops: MarketMapStop[];
  returnToStart: boolean;
  /** Итоговая подпись для скринридера («Схема рынка: …»). */
  a11yLabel?: string;
  testID?: string;
}

/** Геометрия схемы (viewBox 360×240). */
const VB_W = 360;
const VB_H = 240;
const PAD_X = 8;
const LABEL_W = 44;
const TRACK_X0 = LABEL_W;
const TRACK_W = VB_W - TRACK_X0 - PAD_X;
const BANDS_TOP = 10;
const BAND_H = 42;
const BAND_GAP = 5;
const ENTRANCE_Y = BANDS_TOP + 4 * (BAND_H + BAND_GAP) + 8;

/** Координаты места на схеме. */
function spotX(spot: number, spots: number): number {
  return TRACK_X0 + ((spot - 0.5) / spots) * TRACK_W;
}

function rowY(row: number): number {
  return BANDS_TOP + (row - 1) * (BAND_H + BAND_GAP) + BAND_H / 2;
}

export function MarketMap({
  rows,
  spots,
  entrance,
  stops,
  returnToStart,
  a11yLabel,
  testID,
}: MarketMapProps) {
  const { colors, isDark } = useTheme();

  const bandFill = isDark ? colors.backgroundElevated : colors.surfaceMuted;
  const routeColor = colors.primary;
  const nextUnvisited = stops.find((s) => !s.visited);

  // Координаты остановок.
  const stopPos = stops.map((s) => ({
    x: spotX(s.spot, spots),
    y: rowY(s.row),
  }));

  // Ломаная «как схема метро»: ортогональные колена (сначала
  // горизонталь, потом вертикаль). Прямые диагонали резали
  // подписи рядов у левого края (VLM-ревью Промта 17).
  const points: { x: number; y: number }[] = [];
  const firstStop = stopPos[0];
  if (firstStop) {
    points.push({ x: 18, y: ENTRANCE_Y });
    points.push({ x: firstStop.x, y: ENTRANCE_Y });
    points.push(firstStop);
    for (let i = 1; i < stopPos.length; i += 1) {
      const cur = stopPos[i];
      const prev = stopPos[i - 1];
      if (!cur || !prev) break;
      points.push({ x: cur.x, y: prev.y });
      points.push(cur);
    }
  }
  const routePath = points.map((p) => `${p.x},${p.y}`).join(' ');
  const lastStop = stopPos[stopPos.length - 1];
  // Обратная ветка: вниз до полосы входа и по ней к маркеру —
  // не пересекает ни подписи рядов, ни надпись «Вход» (она
  // перенесена под маркер).
  const returnPath =
    returnToStart && lastStop
      ? `${lastStop.x},${lastStop.y} ${lastStop.x},${ENTRANCE_Y} 18,${ENTRANCE_Y}`
      : null;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11yLabel ?? 'Схема рынка'}
      testID={testID}
    >
      <Svg
        width="100%"
        height={VB_H}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        fill="none"
      >
        {/* Ряды рынка */}
        {Array.from({ length: rows }, (_, i) => i + 1).map((row) => (
          <Rect
            key={`band-${row}`}
            x={TRACK_X0}
            y={BANDS_TOP + (row - 1) * (BAND_H + BAND_GAP)}
            width={TRACK_W}
            height={BAND_H}
            rx={8}
            fill={bandFill}
          />
        ))}
        {/* Подписи рядов */}
        {Array.from({ length: rows }, (_, i) => i + 1).map((row) => (
          <SvgText
            key={`label-${row}`}
            x={TRACK_X0 - 8}
            y={rowY(row) + 4}
            textAnchor="end"
            fontSize={12}
            fill={colors.textMuted}
          >
            {`Ряд ${row}`}
          </SvgText>
        ))}

        {/* Линия маршрута */}
        {stops.length > 0 ? (
          <Polyline
            points={routePath}
            stroke={routeColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
        {/* Обратная ветка к выходу — пунктир */}
        {returnPath ? (
          <Polyline
            points={returnPath}
            stroke={routeColor}
            strokeWidth={3}
            strokeDasharray="2 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.85}
          />
        ) : null}

        {/* Вход: залитый маршрутным цветом маркер (VLM: контурный
            «В» читался слабо) + подпись ПОД маркером — полоса входа
            свободна для линии маршрута. */}
        <Circle cx={18} cy={ENTRANCE_Y} r={12} fill={routeColor} />
        <SvgText
          x={18}
          y={ENTRANCE_Y + 5}
          textAnchor="middle"
          fontSize={13}
          fontWeight={700}
          fill={colors.onPrimary}
        >
          В
        </SvgText>
        <SvgText
          x={20}
          y={ENTRANCE_Y + 24}
          textAnchor="middle"
          fontSize={12}
          fill={colors.textSecondary}
        >
          Вход
        </SvgText>

        {/* Точки маршрута */}
        {stops.map((stop) => {
          const cx = spotX(stop.spot, spots);
          const cy = rowY(stop.row);
          const isNext = nextUnvisited?.index === stop.index;
          return (
            <G key={`stop-${stop.index}`}>
              {/* обводка следующей непройденной */}
              {isNext ? (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={15}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth={2}
                />
              ) : null}
              <Circle
                cx={cx}
                cy={cy}
                r={12}
                fill={stop.visited ? colors.success : routeColor}
              />
              {stop.visited ? (
                <Polyline
                  points={`${cx - 4.5},${cy} ${cx - 1},${cy + 3.5} ${cx + 5},${cy - 3.5}`}
                  stroke={colors.onPrimary}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : (
                <SvgText
                  x={cx}
                  y={cy + 5}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill={colors.onPrimary}
                >
                  {String(stop.index)}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
      {/* Текстовая подсказка схемы — дублирует номер ряда для
          скринридера (SVG-текст не всегда озвучивается). */}
      <Text variant="micro" color="textMuted" style={{ marginTop: 4 }}>
        {`Схема: ряды 1–${rows}, ${spots} мест в ряду. Вход — у нижнего края.`}
      </Text>
    </View>
  );
}
