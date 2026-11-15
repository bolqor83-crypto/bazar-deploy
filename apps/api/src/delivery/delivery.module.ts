/**
 * Модуль доставок (Промт 10, Часть D): заявки на доставку
 * заказов, лента перевозчика, ведение рейса и уведомления.
 */
import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { CarrierDeliveryController } from './carrier-delivery.controller';
import { DeliveryService } from './delivery.service';

@Module({
  controllers: [DeliveryController, CarrierDeliveryController],
  providers: [DeliveryService],
})
export class DeliveryModule {}
