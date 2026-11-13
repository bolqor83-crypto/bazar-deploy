/**
 * Модуль кабинета продавца (Промт 10, Часть B/C).
 */
import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';
import { SellerOrderService } from './seller-order.service';
import { SellerMembershipGuard } from './guards/seller-membership.guard';

@Module({
  controllers: [SellerController],
  providers: [SellerService, SellerOrderService, SellerMembershipGuard],
  exports: [SellerService, SellerOrderService],
})
export class SellerModule {}
