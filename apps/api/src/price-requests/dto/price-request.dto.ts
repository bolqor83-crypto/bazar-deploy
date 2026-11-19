/**
 * DTO запросов цены (Промт 16, Часть C).
 *
 * Цены — в копейках (без дробей), как во всём API.
 */
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Создание запроса цены (покупатель). */
export class CreatePriceRequestDto {
  @IsString()
  offerId!: string;

  /** Желаемое количество (единиц оффера). */
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity!: number;

  /** Сообщение продавцу (необязательно). */
  @IsOptional()
  @IsString()
  @MinLength(0)
  @MaxLength(500)
  message?: string;
}

/** Ответ продавца ценой (копейки за единицу). */
export class RespondPriceRequestDto {
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  price!: number;
}

/** Отклонение запроса (причина необязательна). */
export class DeclinePriceRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

/** Фильтр списка (query): статус + пагинация. */
export class ListPriceRequestsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
