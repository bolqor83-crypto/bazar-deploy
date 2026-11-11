/**
 * DTO организаций и точек (Промт 7).
 */
import { IsIn, IsString, MinLength } from 'class-validator';
import {
  API_ORGANIZATION_TYPES,
  type ApiOrganizationType,
} from '../../common/mappers';

export class CreateOrganizationDto {
  @MinLength(2, { message: 'Название: минимум 2 символа' })
  @IsString()
  name!: string;

  @IsIn(API_ORGANIZATION_TYPES as unknown as string[], {
    message: 'Тип организации: WHOLESALE, RETAIL или LOGISTICS',
  })
  type!: ApiOrganizationType;
}

export class CreateLocationDto {
  @MinLength(2, { message: 'Название: минимум 2 символа' })
  @IsString()
  name!: string;

  @MinLength(5, { message: 'Адрес: минимум 5 символов' })
  @IsString()
  address!: string;

  @MinLength(2, { message: 'Город: минимум 2 символа' })
  @IsString()
  city!: string;
}
