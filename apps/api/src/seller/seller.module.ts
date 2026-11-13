/**
 * Модуль кабинета продавца (Промт 10, Часть B).
 */
import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';
import { SellerMembershipGuard } from './guards/seller-membership.guard';

@Module({
  controllers: [SellerController],
  providers: [SellerService, SellerMembershipGuard],
  exports: [SellerService],
})
export class SellerModule {}
