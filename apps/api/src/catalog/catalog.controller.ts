/**
 * Контроллер каталога: /api/catalog/*.
 *
 * Четыре публичных маршрута (как health — без Bearer): витрина
 * доступна без входа, заказы и корзина потребуют аутентификации.
 * Лимиты — default (100/мин): каталог читают, а не долбят.
 */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { CatalogService } from './catalog.service';
import { ListProductsQueryDto } from './dto/list-products.query';

@ApiTags('Каталог')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get('categories')
  @ApiOperation({ summary: 'Категории с числом товаров' })
  categories() {
    return this.catalog.categories();
  }

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get('products')
  @ApiOperation({
    summary: 'Список товаров: поиск, фильтры, сортировка, пагинация',
  })
  list(@Query() query: ListProductsQueryDto) {
    return this.catalog.list({
      category: query.category,
      q: query.q,
      sort: query.sort,
      page: query.page,
      // limit — алиас pageSize (Промт 9); прямой параметр приоритетнее.
      pageSize: query.pageSize ?? query.limit,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
    });
  }

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get('products/:id')
  @ApiOperation({ summary: 'Товар с предложениями продавцов' })
  detail(@Param('id') id: string) {
    return this.catalog.detail(id);
  }

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get('products/:id/offers')
  @ApiOperation({ summary: 'Предложения товара (дешёвое первым)' })
  offers(@Param('id') id: string) {
    return this.catalog.offers(id);
  }
}
