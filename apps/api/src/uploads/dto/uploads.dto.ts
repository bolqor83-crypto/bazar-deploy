/**
 * DTO загрузок (Промт 10, Часть B).
 */
import { IsIn } from 'class-validator';

/** Whitelist типов: только растровые форматы без анимации. */
export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export class PresignDto {
  @IsIn(ALLOWED_CONTENT_TYPES as unknown as string[])
  contentType!: string;
}
