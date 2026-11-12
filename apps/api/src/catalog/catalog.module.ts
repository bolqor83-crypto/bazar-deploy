/**
 * Модуль каталога: публичное чтение витрины (Промт 8, Часть C).
 * Изменение товаров (создание/правка предложений) — Промт 9.
 */
import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
