/**
 * DTO маршрута по рынку и позиции на рынке (Промт 17, Часть B).
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Разбор orderIds=a,b,c в массив (пустая строка — undefined). */
function parseIdList({ value }: { value: unknown }) {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  return value
    .split(',')
    .map((part: string) => part.trim())
    .filter((part: string) => part !== '');
}

export class MarketRouteQueryDto {
  /** Замкнуть маршрут ко входу («вернуться к выходу»). */
  @IsOptional()
  @IsBooleanString()
  returnToStart?: string;

  /** Свои id заказов через запятую; default — все активные. */
  @IsOptional()
  @Transform(parseIdList)
  @IsArray()
  @IsString({ each: true })
  orderIds?: string[];
}

export class SaveMarketPositionDto {
  /** Ряд на рынке, 1..4. */
  @ApiPropertyOptional({ description: 'Ряд на рынке, 1..4', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  marketRow!: number;

  /** Место в ряду, 1..40. */
  @ApiPropertyOptional({ description: 'Место в ряду, 1..40', example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(40)
  marketSpot!: number;
}

export class PatchLocationMarketDto {
  /** Ряд на рынке 1..4; null — очистить позицию. */
  @ApiPropertyOptional({
    description: 'Ряд на рынке 1..4; null — очистить позицию',
    example: 3,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === '' || value === 'null' ? null : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(4)
  marketRow?: number | null;

  /** Место в ряду 1..40; null — очистить позицию. */
  @ApiPropertyOptional({
    description: 'Место в ряду 1..40; null — очистить позицию',
    example: 12,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === '' || value === 'null' ? null : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(40)
  marketSpot?: number | null;
}

/**
 * Аналитика рынка — AI Layer 0 (Промт 18, Часть C).
 * Окно: day / week / month (по умолчанию week).
 */
export class AnalyticsQueryDto {
  /** Период агреграции. */
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  period?: 'day' | 'week' | 'month';
}

/** Тренды цен: фильтр по категории. */
export class TrendsQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  category?: string;
}
