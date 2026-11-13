/**
 * DTO уведомлений (Промт 10, Часть C).
 */
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Список уведомлений: пагинация + только непрочитанные. */
export class ListNotificationsQueryDto {
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

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unread?: boolean;
}

/** Параметр id уведомления. */
export class NotificationIdDto {
  @IsString()
  @MaxLength(64)
  id!: string;
}
