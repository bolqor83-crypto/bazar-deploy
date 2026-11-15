/**
 * DTO доставок (Промт 10, Часть D).
 */
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Создание заявки на доставку по заказу (buyer или seller). */
export class CreateDeliveryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  pickupAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  pickupContact!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  dropoffAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dropoffContact!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(10_000)
  weightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100_000)
  volumeL?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cargoNotes?: string;
}

/** Принятие заявки перевозчиком (ставка в копейках, опциональна). */
export class AcceptDeliveryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  price?: number;
}

/** Отмена заявки: причина обязательна. */
export class CancelDeliveryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason!: string;
}

/** Сегмент ленты перевозчика. */
export const CARRIER_SCOPES = ['feed', 'mine'] as const;
export type CarrierScope = (typeof CARRIER_SCOPES)[number];

/** Список доставок перевозчика: scope + пагинация. */
export class ListCarrierDeliveriesQueryDto {
  @IsIn(CARRIER_SCOPES as unknown as string[])
  scope!: CarrierScope;

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
