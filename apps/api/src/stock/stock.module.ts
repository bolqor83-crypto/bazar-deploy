/**
 * Модуль склада (Промт 11).
 */
import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { SellerMembershipGuard } from '../seller/guards/seller-membership.guard';

@Module({
  controllers: [StockController],
  providers: [StockService, SellerMembershipGuard],
  exports: [StockService],
})
export class StockModule {}
