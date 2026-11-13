/**
 * Контроллер уведомлений: /api/notifications (Промт 10, Часть C).
 *
 * Все маршруты под JWT (глобальный guard). Создание уведомлений —
 * не через API, а серверными событиями заказов.
 */
import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { ListNotificationsQueryDto } from './dto/notification.dto';

@ApiTags('Уведомления')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Список уведомлений (пагинация, unread)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.list(user.userId, {
      page: query.page,
      pageSize: query.pageSize,
      unread: query.unread,
    });
  }

  @Get('unread-count')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Количество непрочитанных' })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.unreadCount(user.userId);
  }

  @Post(':id/read')
  @HttpCode(200)
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiOperation({ summary: 'Отметить уведомление прочитанным' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notifications.markRead(user.userId, id);
  }

  @Post('read-all')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Отметить все прочитанными' })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user.userId);
  }
}
