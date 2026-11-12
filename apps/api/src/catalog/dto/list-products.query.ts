/**
 * DTO каталога (Промт 8, Часть C).
 *
 * Все маршруты каталога публичные (как health): просмотр витрины не
 * требует входа — покупатель оценивает ассортимент до регистрации.
 * Цены в ответах — копейки (priceKopecks); фильтры цены в запросе —
 * целые рубли: их вводит человек в поле «от/до».
 */
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Способы сортировки списка товаров. */
export const CATALOG_SORTS = [
  'popular',
  'price-asc',
  'price-desc',
  'name',
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export class ListProductsQueryDto {
  /** Slug категории («vegetables»); пусто — все категории. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  /** Поисковая строка: вхождение в название или описание. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  /** Сортировка; по умолчанию — popular. */
  @IsOptional()
  @IsIn(CATALOG_SORTS as unknown as string[])
  sort?: CatalogSort;

  /** Страница, с 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Товаров на странице; по умолчанию 10, максимум 50. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  /** Цена «от», целые рубли (лучшая цена товара). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  minPrice?: number;

  /** Цена «до», целые рубли. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  maxPrice?: number;
}
