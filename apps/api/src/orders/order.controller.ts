/**
 * Контроллер заказов: /api/orders (Промт 9, Часть E).
 *
 * Создание — из позиций корзины (клиент передаёт items).
 * Список/деталь/отмена — buyer или seller (членство организации).
 * Смена статусов продавцом (confirm/preparing/ready/complete) — Промт 10.
 */
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { OrderService } from './order.service';
import { CreateOrderDto, ListOrdersQueryDto } from './dto/order.dto';

@ApiTags('Заказы')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @ApiOperation({
    summary: 'Создать заказ(ы): группировка по продавцу, stock-резерв',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader: string | undefined,
    @Body() dto: CreateOrderDto,
  ) {
    const organizationId =
      orgHeader && orgHeader.trim() !== '' ? orgHeader.trim() : null;
    return this.orders.create({
      buyerId: user.userId,
      organizationId,
      items: dto.items.map((i) => ({
        offerId: i.offerId,
        quantity: i.quantity,
      })),
      address: dto.address,
      comment: dto.comment,
      deliveryMethod: dto.deliveryMethod,
    });
  }

  @Get()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Список заказов покупителя: фильтры, пагинация' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.orders.list(user.userId, {
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
      from: query.from,
      to: query.to,
    });
  }

  @Get(':id')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Детали заказа (buyer или seller)' })
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') orderId: string) {
    return this.orders.detail(user.userId, orderId);
  }

  @Post(':id/cancel')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Отменить заказ (PENDING/CONFIRMED), stock назад' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') orderId: string) {
    return this.orders.cancel(user.userId, orderId);
  }
}
