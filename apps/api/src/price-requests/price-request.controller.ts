/**
 * Контроллер запросов цены: /api/price-requests (Промт 16, C).
 *
 * Покупатель: POST (создать, 10/мин — защита от спама продавцу),
 * GET (мои), GET :id (свой).
 * Продавец: GET incoming (X-Organization-Id + членство
 * WHOLESALE_SELLER), POST :id/respond, POST :id/decline.
 */
import {
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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import {
  CurrentSeller,
  SellerMembershipGuard,
  type SellerContext,
} from '../seller/guards/seller-membership.guard';
import { PriceRequestService } from './price-request.service';
import {
  CreatePriceRequestDto,
  DeclinePriceRequestDto,
  ListPriceRequestsQueryDto,
  RespondPriceRequestDto,
} from './dto/price-request.dto';

@ApiTags('Запросы цены')
@ApiBearerAuth()
@Controller('price-requests')
export class PriceRequestController {
  constructor(private readonly requests: PriceRequestService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Запросить цену (окупает priceOnRequest-оффер)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePriceRequestDto,
  ) {
    return this.requests.create(user.userId, {
      offerId: dto.offerId,
      quantity: dto.quantity,
      message: dto.message,
    });
  }

  @Get()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Мои запросы цены (покупатель)' })
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPriceRequestsQueryDto,
  ) {
    return this.requests.listMine(user.userId, {
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('incoming')
  @UseGuards(SellerMembershipGuard)
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Входящие запросы (организация продавца)' })
  listIncoming(
    @CurrentSeller() seller: SellerContext,
    @Query() query: ListPriceRequestsQueryDto,
  ) {
    return this.requests.listIncoming(seller.organizationId, {
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':id')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Деталь запроса (свой или организации продавца)' })
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.requests.detail(user.userId, id);
  }

  @Post(':id/respond')
  @UseGuards(SellerMembershipGuard)
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Ответить персональной ценой (72 часа, копейки)',
  })
  respond(
    @CurrentSeller() seller: SellerContext,
    @Param('id') id: string,
    @Body() dto: RespondPriceRequestDto,
  ) {
    return this.requests.respond(seller, id, dto.price);
  }

  @Post(':id/decline')
  @UseGuards(SellerMembershipGuard)
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Отклонить запрос (с причиной или без)' })
  decline(
    @CurrentSeller() seller: SellerContext,
    @Param('id') id: string,
    @Body() dto: DeclinePriceRequestDto,
  ) {
    return this.requests.decline(seller, id, dto.reason);
  }
}
