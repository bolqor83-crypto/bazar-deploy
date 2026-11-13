/**
 * DTO кабинета продавца (Промт 10, Часть B).
 *
 * Цены — в копейках (без дробей), как во всём API.
 */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  categoryId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(16)
  unit!: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  unit?: string;
}

export class OfferDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  price!: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minQuantity?: number;

  @IsOptional()
  @IsIn(['hit', 'new', 'discount'])
  badge?: string;

  @IsOptional()
  @IsBoolean()
  isPerishable?: boolean;

  /** URL загруженных фото — применяются к товару. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class UpdateOfferDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  /** Причина изменения склада — в журнал StockChange. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  stockReason?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minQuantity?: number;

  /** Пустая строка — снять бейдж. */
  @IsOptional()
  @IsIn(['hit', 'new', 'discount', ''])
  badge?: string;

  @IsOptional()
  @IsBoolean()
  isPerishable?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
