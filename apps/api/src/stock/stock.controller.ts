/**
 * Контроллер склада: /api/stock/* (Промт 11).
 *
 * Все маршруты: JWT + SellerMembershipGuard (WHOLESALE_SELLER в
 * организации из X-Organization-Id). Склады, остатки, журнал
 * движений и перемещения — только своей организации.
 */
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { StockService } from './stock.service';
import {
  CurrentSeller,
  SellerMembershipGuard,
  type SellerContext,
} from '../seller/guards/seller-membership.guard';
import {
  CreateLocationDto,
  CreateMovementDto,
  TransferDto,
  UpdateLocationDto,
} from './dto/stock.dto';

@ApiTags('Склад')
@ApiBearerAuth()
@UseGuards(SellerMembershipGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  // -------------------------------------------------------------------
  // Склады
  // -------------------------------------------------------------------

  @Get('locations')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Склады организации' })
  listLocations(@CurrentSeller() seller: SellerContext) {
    return this.stock.listLocations(seller);
  }

  @Post('locations')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Создать склад' })
  createLocation(
    @CurrentSeller() seller: SellerContext,
    @Body() dto: CreateLocationDto,
  ) {
    return this.stock.createLocation(seller, dto);
  }

  @Patch('locations/:id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Обновить склад' })
  updateLocation(
    @CurrentSeller() seller: SellerContext,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.stock.updateLocation(seller, id, dto);
  }

  @Delete('locations/:id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Удалить склад (только без движений)' })
  deleteLocation(
    @CurrentSeller() seller: SellerContext,
    @Param('id') id: string,
  ) {
    return this.stock.deleteLocation(seller, id);
  }

  // -------------------------------------------------------------------
  // Остатки
  // -------------------------------------------------------------------

  @Get('balances')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Остатки организации (фильтры: склад, оффер)' })
  listBalances(
    @CurrentSeller() seller: SellerContext,
    @Query('locationId') locationId?: string,
    @Query('offerId') offerId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.stock.listBalances(seller, {
      locationId,
      offerId,
      page,
      pageSize,
    });
  }

  @Get('balances/:offerId/:locationId')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Остаток оффера на складе' })
  getBalance(
    @CurrentSeller() seller: SellerContext,
    @Param('offerId') offerId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.stock.getBalance(seller, offerId, locationId);
  }

  @Get('summary')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Сводный остаток оффера по всем складам' })
  summary(
    @CurrentSeller() seller: SellerContext,
    @Query('offerId') offerId: string,
  ) {
    return this.stock.summary(seller, offerId);
  }

  // -------------------------------------------------------------------
  // Движения
  // -------------------------------------------------------------------

  @Get('movements')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Журнал движений (фильтры, пагинация)' })
  listMovements(
    @CurrentSeller() seller: SellerContext,
    @Query('offerId') offerId?: string,
    @Query('locationId') locationId?: string,
    @Query('type') type?: string,
    @Query('from', new DefaultValuePipe(0), ParseIntPipe) from?: number,
    @Query('to', new DefaultValuePipe(0), ParseIntPipe) to?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.stock.listMovements(seller, {
      offerId,
      locationId,
      type,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize,
    });
  }

  @Post('movements')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Ручное движение: приход/списание/корректировка' })
  createMovement(
    @CurrentSeller() seller: SellerContext,
    @Body() dto: CreateMovementDto,
  ) {
    return this.stock.createMovement(seller, dto);
  }

  @Post('transfer')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Перемещение между складами (атомарно)' })
  transfer(@CurrentSeller() seller: SellerContext, @Body() dto: TransferDto) {
    return this.stock.transfer(seller, dto);
  }
}
