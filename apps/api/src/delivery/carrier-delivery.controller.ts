/**
 * Контроллер доставок перевозчика: /api/carrier/deliveries
 * (Промт 10, Часть D).
 *
 * Все маршруты: JWT + CarrierMembershipGuard (CARRIER в
 * организации из X-Organization-Id). Лента свободных заявок
 * (feed), свои рейсы (mine), принятие и ведение по статусам.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DeliveryService } from './delivery.service';
import type { CarrierAction } from './delivery.service';
import {
  CurrentCarrier,
  CarrierMembershipGuard,
  type CarrierContext,
} from './guards/carrier-membership.guard';
import {
  AcceptDeliveryDto,
  ListCarrierDeliveriesQueryDto,
} from './dto/delivery.dto';

/** Действия ведения рейса (без accept — у него body со ставкой). */
const PROGRESS_ACTIONS = ['picked-up', 'in-transit', 'delivered'];

@ApiTags('Доставки перевозчика')
@ApiBearerAuth()
@UseGuards(CarrierMembershipGuard)
@Controller('carrier/deliveries')
export class CarrierDeliveryController {
  constructor(private readonly deliveries: DeliveryService) {}

  @Get()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Лента доставок: scope=feed (свободные) | mine (мои)',
  })
  list(
    @CurrentCarrier() carrier: CarrierContext,
    @Query() query: ListCarrierDeliveriesQueryDto,
  ) {
    return this.deliveries.carrierList(carrier, query.scope, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':id')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Детали доставки для перевозчика' })
  detail(@CurrentCarrier() carrier: CarrierContext, @Param('id') id: string) {
    return this.deliveries.carrierDetail(carrier, id);
  }

  @Post(':id/accept')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Принять заявку (атомарно PENDING → ACCEPTED)' })
  accept(
    @CurrentCarrier() carrier: CarrierContext,
    @Param('id') id: string,
    @Body() dto: AcceptDeliveryDto,
  ) {
    return this.deliveries.carrierAct(carrier, id, 'accept', dto.price);
  }

  /** Единый маршрут ведения рейса: picked-up | in-transit | delivered. */
  @Post(':id/:action')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Вести рейс: picked-up / in-transit / delivered',
  })
  progress(
    @CurrentCarrier() carrier: CarrierContext,
    @Param('id') id: string,
    @Param('action') action: string,
  ) {
    if (!PROGRESS_ACTIONS.includes(action)) {
      throw new BadRequestException({
        code: 'UNKNOWN_ACTION',
        message: 'Неизвестное действие',
      });
    }
    return this.deliveries.carrierAct(carrier, id, action as CarrierAction);
  }
}
