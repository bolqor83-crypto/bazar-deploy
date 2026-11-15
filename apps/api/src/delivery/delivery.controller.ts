/**
 * Контроллер доставок участников: /api/deliveries (Промт 10, D).
 *
 * Создание заявки (buyer/seller по своему заказу), детали и
 * завершение (buyer), отмена с причиной. Все маршруты — JWT.
 */
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { DeliveryService } from './delivery.service';
import { CancelDeliveryDto, CreateDeliveryDto } from './dto/delivery.dto';

@ApiTags('Доставки')
@ApiBearerAuth()
@Controller('deliveries')
export class DeliveryController {
  constructor(private readonly deliveries: DeliveryService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Создать заявку на доставку заказа' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeliveryDto,
  ) {
    return this.deliveries.create({
      requesterId: user.userId,
      orderId: dto.orderId,
      pickupAddress: dto.pickupAddress,
      pickupContact: dto.pickupContact,
      dropoffAddress: dto.dropoffAddress,
      dropoffContact: dto.dropoffContact,
      weightKg: dto.weightKg,
      volumeL: dto.volumeL,
      cargoNotes: dto.cargoNotes,
    });
  }

  @Get(':id')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Детали доставки (участник)' })
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveries.detail(user.userId, id);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Подтвердить получение (покупатель)' })
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveries.complete(user.userId, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Отменить заявку с причиной' })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelDeliveryDto,
  ) {
    return this.deliveries.cancel(user.userId, id, dto.reason);
  }
}
