/**
 * DTO склада (Промт 11).
 *
 * Движения: количество в единицах товара (целое), причина —
 * человекочитаемая строка (минимум 3 символа, аудит движения).
 */
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Типы складов (строки из packages/types). */
const LOCATION_TYPES = ['WAREHOUSE', 'STORE', 'OTHER'] as const;

/** Ручные типы движений (остальные — только из бизнес-логики). */
const MANUAL_MOVEMENT_TYPES = ['RECEIPT', 'WRITE_OFF', 'ADJUSTMENT'] as const;

export class CreateLocationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsIn(LOCATION_TYPES)
  type!: (typeof LOCATION_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsIn(LOCATION_TYPES)
  type?: (typeof LOCATION_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateMovementDto {
  @IsString()
  offerId!: string;

  /** Не указан — default-склад организации. */
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsIn(MANUAL_MOVEMENT_TYPES)
  type!: (typeof MANUAL_MOVEMENT_TYPES)[number];

  /**
   * RECEIPT/WRITE_OFF — всегда > 0; ADJUSTMENT — дельта со знаком
   * (отрицательная = недостача, может увести остаток в минус).
   */
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  quantity!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason!: string;
}

export class TransferDto {
  @IsString()
  offerId!: string;

  @IsString()
  fromLocationId!: string;

  @IsString()
  toLocationId!: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason!: string;
}
