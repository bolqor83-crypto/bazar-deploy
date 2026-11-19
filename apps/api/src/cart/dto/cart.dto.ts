/**
 * DTO корзины (Промт 9, Часть D).
 *
 * Корзина привязана к (userId, organizationId): контур задаётся
 * заголовком X-Organization-Id (отсутствие/пусто — розничный контур
 * покупателя). Количество — целое, ограничено stock предложения.
 */
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Добавление позиции: offerId + количество (не ниже minQuantity).
 * Промт 16 (C): priceRequestId — добавить по персональному
 * предложению (цена строки = quotedPriceKopecks). */
export class AddCartItemDto {
  @IsString()
  @MaxLength(64)
  offerId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  quantity!: number;

  /** Персональное предложение (необязательно). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  priceRequestId?: string;
}

/** Изменение количества позиции. */
export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  quantity!: number;
}

/** Контур корзины из заголовка X-Organization-Id. */
export function cartScopeFromHeader(
  headerValue: string | undefined,
): string | null {
  if (!headerValue || headerValue.trim() === '') {
    return null;
  }
  return headerValue.trim();
}
