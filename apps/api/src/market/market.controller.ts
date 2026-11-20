/**
 * Контроллер рынка: /api/market (Промт 17, Часть B).
 *
 * GET /market/route — маршрут покупателя по активным заказам
 * (JWT; чужие orderIds молча игнорируются — существование
 * чужих заказов не раскрывается).
 * GET/PUT/DELETE /market/position — позиция организации-продавца
 * на сетке рынка (X-Organization-Id + членство).
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import {
  CurrentSeller,
  SellerMembershipGuard,
  type SellerContext,
} from '../seller/guards/seller-membership.guard';
import { MarketService } from './market.service';
import {
  MarketRouteQueryDto,
  PatchLocationMarketDto,
  SaveMarketPositionDto,
} from './dto/market.dto';

@ApiTags('Рынок')
@ApiBearerAuth()
@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get('route')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Оптимальный маршрут по рынку (свои активные заказы)',
  })
  route(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MarketRouteQueryDto,
  ) {
    return this.market.buildRoute(user.userId, {
      returnToStart: query.returnToStart === 'true',
      orderIds: query.orderIds,
    });
  }

  @Get('position')
  @UseGuards(SellerMembershipGuard)
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Позиция организации на рынке' })
  async getPosition(@CurrentSeller() seller: SellerContext) {
    // Обёртка { position }: NestJS сериализует null-ответ в пустое
    // тело — контракт остаётся явным JSON для клиента.
    const position = await this.market.getPosition(seller.organizationId);
    return { position };
  }

  @Put('position')
  @UseGuards(SellerMembershipGuard)
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Сохранить позицию на рынке (ряд, место)' })
  savePosition(
    @CurrentSeller() seller: SellerContext,
    @Body() dto: SaveMarketPositionDto,
  ) {
    return this.market.savePosition(seller.userId, seller.organizationId, dto);
  }

  @Delete('position')
  @UseGuards(SellerMembershipGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Снять позицию с рынка' })
  clearPosition(@CurrentSeller() seller: SellerContext) {
    return this.market.clearPosition(seller.userId, seller.organizationId);
  }
}

/**
 * PATCH /api/locations/:id — рыночные поля точки (Промт 17, B).
 * Живёт здесь, а не в LocationsController, чтобы market-логика
 * (валидация, права ролей) осталась в одном модуле.
 */
@ApiTags('Точки')
@ApiBearerAuth()
@Controller('locations')
export class MarketLocationsController {
  constructor(private readonly market: MarketService) {}

  @Patch(':id')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Рыночные поля точки (ряд/место, null — очистить)' })
  patchMarket(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') locationId: string,
    @Body() dto: PatchLocationMarketDto,
  ) {
    return this.market.patchLocationMarket(user.userId, locationId, {
      marketRow: dto.marketRow,
      marketSpot: dto.marketSpot,
    });
  }
}
