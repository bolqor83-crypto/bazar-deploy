/**
 * Контроллер кабинета продавца: /api/seller/* (Промт 10, Часть B).
 *
 * Все маршруты: JWT + SellerMembershipGuard (WHOLESALE_SELLER в
 * организации из X-Organization-Id).
 */
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SellerService } from './seller.service';
import {
  CurrentSeller,
  SellerMembershipGuard,
  type SellerContext,
} from './guards/seller-membership.guard';
import {
  OfferDto,
  ProductDto,
  UpdateOfferDto,
  UpdateProductDto,
} from './dto/seller.dto';

@ApiTags('Кабинет продавца')
@ApiBearerAuth()
@UseGuards(SellerMembershipGuard)
@Controller('seller')
export class SellerController {
  constructor(private readonly seller: SellerService) {}

  // -------------------------------------------------------------------
  // Products
  // -------------------------------------------------------------------

  @Get('products')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Товары организации (active/archived)' })
  listProducts(
    @CurrentSeller() seller: SellerContext,
    @Query('archived', new DefaultValuePipe(false), ParseBoolPipe)
    archived: boolean,
  ) {
    return this.seller.listProducts(seller, { archived });
  }

  @Post('products')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Создать товар' })
  createProduct(
    @CurrentSeller() sellerCtx: SellerContext,
    @Body() dto: ProductDto,
  ) {
    return this.seller.createProduct(sellerCtx, dto);
  }

  @Patch('products/:id')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Обновить товар' })
  updateProduct(
    @CurrentSeller() seller: SellerContext,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.seller.updateProduct(seller, id, dto);
  }

  @Delete('products/:id')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Архивировать товар (soft-delete)' })
  archiveProduct(
    @CurrentSeller() seller: SellerContext,
    @Param('id') id: string,
  ) {
    return this.seller.archiveProduct(seller, id);
  }

  // -------------------------------------------------------------------
  // Offers
  // -------------------------------------------------------------------

  @Get('offers')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Предложения (active/archived, поиск, пагинация)' })
  listOffers(
    @CurrentSeller() seller: SellerContext,
    @Query('archived', new DefaultValuePipe(false), ParseBoolPipe)
    archived: boolean,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.seller.listOffers(seller, {
      archived,
      search,
      page,
      pageSize,
    });
  }

  @Get('offers/:id')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Предложение с историей цены и склада' })
  getOffer(@CurrentSeller() seller: SellerContext, @Param('id') id: string) {
    return this.seller.getOffer(seller, id);
  }

  @Post('offers')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Создать предложение (партию)' })
  createOffer(@CurrentSeller() seller: SellerContext, @Body() dto: OfferDto) {
    return this.seller.createOffer(seller, dto);
  }

  @Patch('offers/:id')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Обновить цену/склад/партию' })
  updateOffer(
    @CurrentSeller() seller: SellerContext,
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.seller.updateOffer(seller, id, dto);
  }

  @Delete('offers/:id')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Удалить или архивировать предложение' })
  deleteOffer(@CurrentSeller() seller: SellerContext, @Param('id') id: string) {
    return this.seller.deleteOffer(seller, id);
  }
}
