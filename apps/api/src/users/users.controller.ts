/**
 * Пользователи: /api/users/me — профиль без токенов.
 */
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../auth/auth.service';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('Пользователи')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get('me')
  @ApiOperation({ summary: 'Профиль текущего пользователя' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.userId);
  }
}
