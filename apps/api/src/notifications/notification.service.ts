/**
 * Сервис уведомлений (Промт 10, Часть C): список, непрочитанные,
 * отметка о прочтении. Создание уведомлений — notifyOrderEvent
 * внутри транзакций сервисов заказов.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toNotificationView, type NotificationView } from './notify.helper';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Список уведомлений пользователя (новые сверху). */
  async list(
    userId: string,
    filter: { page?: number; pageSize?: number; unread?: boolean },
  ): Promise<{
    items: NotificationView[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
    unread: number;
  }> {
    const pageSize = filter.pageSize ?? 20;
    const page = filter.page ?? 1;
    const where: Prisma.NotificationWhereInput = { userId };
    if (filter.unread) {
      where.readAt = null;
    }
    const [rows, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);
    return {
      items: rows.map(toNotificationView),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      unread,
    };
  }

  /** Количество непрочитанных (объект — стабильный контракт JSON). */
  async unreadCount(userId: string): Promise<{ unread: number }> {
    const unread = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { unread };
  }

  /** Отметить одно уведомление прочитанным. */
  async markRead(userId: string, id: string): Promise<NotificationView> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Уведомление не найдено',
      });
    }
    if (notification.readAt) {
      return toNotificationView(notification);
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return toNotificationView(updated);
  }

  /** Отметить все прочитанными. */
  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      throw new BadRequestException({
        code: 'NOTHING_TO_READ',
        message: 'Непрочитанных уведомлений нет',
      });
    }
    return { updated: result.count };
  }
}
