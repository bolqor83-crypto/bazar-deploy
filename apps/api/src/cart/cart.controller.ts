/**
 * Контроллер корзины: /api/cart (Промт 9, Часть D).
 *
 * Все маршруты под JWT. Контур — заголовок X-Organization-Id
 * (отсутствие — розничная корзина покупателя).
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CartService } from './cart.service';
import {
  AddCartItemDto,
  UpdateCartItemDto,
  cartScopeFromHeader,
} from './dto/cart.dto';

@ApiTags('Корзина')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  /** Контур: '' (розница) или id организации опта. */
  private scope(header: string | undefined): string {
    return cartScopeFromHeader(header) ?? '';
  }

  @Get()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Корзина контура: позиции, итог, warnings' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader: string | undefined,
  ) {
    return this.cart.getCart(user.userId, this.scope(orgHeader));
  }

  @Post('items')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Добавить предложение в корзину' })
  @HttpCode(200)
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader: string | undefined,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cart.addItem(
      user.userId,
      this.scope(orgHeader),
      dto.offerId,
      dto.quantity,
    );
  }

  @Patch('items/:id')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Изменить количество позиции' })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader: string | undefined,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cart.updateItem(
      user.userId,
      this.scope(orgHeader),
      itemId,
      dto.quantity,
    );
  }

  @Delete('items/:id')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Удалить позицию' })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader: string | undefined,
    @Param('id') itemId: string,
  ) {
    return this.cart.removeItem(user.userId, this.scope(orgHeader), itemId);
  }

  @Delete()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Очистить корзину контура' })
  clear(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader: string | undefined,
  ) {
    return this.cart.clear(user.userId, this.scope(orgHeader));
  }
}
