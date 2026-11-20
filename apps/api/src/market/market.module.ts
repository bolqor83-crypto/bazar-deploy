/**
 * Модуль рынка (Промт 17, Часть B; аналитика — Промт 18, Часть C).
 */
import { Module } from '@nestjs/common';
import {
  MarketController,
  MarketLocationsController,
} from './market.controller';
import { MarketService } from './market.service';
import { MarketAnalyticsService } from './analytics.service';

@Module({
  controllers: [MarketController, MarketLocationsController],
  providers: [MarketService, MarketAnalyticsService],
  exports: [MarketService, MarketAnalyticsService],
})
export class MarketModule {}
