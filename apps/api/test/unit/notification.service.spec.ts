/**
 * Unit-тесты NotificationService (Промт 10, Часть C): список с
 * фильтром unread, счётчик непрочитанных, отметка одного/всех.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationService } from '../../src/notifications/notification.service';
import type { PrismaService } from '../../src/prisma/prisma.service';

/** Запись уведомления в фейке. */
interface Row {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  payload: string | null;
  orderId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

function makeFake() {
  const rows: Row[] = [];
  let seq = 0;

  const matches = (row: Row, where: Record<string, unknown>): boolean => {
    if (where.userId && row.userId !== where.userId) return false;
    if (
      where.readAt !== undefined &&
      row.readAt !== (where.readAt as Date | null)
    )
      return false;
    return true;
  };

  return {
    rows,
    notification: {
      findMany: async ({
        where,
        orderBy,
        skip,
        take,
      }: {
        where?: Record<string, unknown>;
        orderBy?: { createdAt: 'asc' | 'desc' };
        skip?: number;
        take?: number;
      }) => {
        const filtered = rows.filter((r) => matches(r, where ?? {}));
        if (orderBy?.createdAt) {
          filtered.sort((a, b) =>
            orderBy.createdAt === 'desc'
              ? b.createdAt.getTime() - a.createdAt.getTime()
              : a.createdAt.getTime() - b.createdAt.getTime(),
          );
        }
        return filtered.slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length));
      },
      count: async ({ where }: { where?: Record<string, unknown> }) =>
        rows.filter((r) => matches(r, where ?? {})).length,
      findUnique: async ({ where }: { where: { id: string } }) =>
        rows.find((r) => r.id === where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { readAt: Date };
      }) => {
        const row = rows.find((r) => r.id === where.id);
        if (!row) throw new Error('not found');
        row.readAt = data.readAt;
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: { readAt: Date };
      }) => {
        let count = 0;
        for (const row of rows) {
          if (matches(row, where)) {
            row.readAt = data.readAt;
            count += 1;
          }
        }
        return { count };
      },
    },
    add(userId: string, read = false, payload?: string): Row {
      seq += 1;
      const row: Row = {
        id: `notif-${seq}`,
        userId,
        type: 'ORDER_STATUS',
        title: `Уведомление ${seq}`,
        body: 'Текст',
        payload: payload ?? null,
        orderId: 'order-1',
        readAt: read ? new Date('2026-11-13T09:00:00Z') : null,
        createdAt: new Date(
          `2026-11-13T08:${String(seq).padStart(2, '0')}:00Z`,
        ),
      };
      rows.push(row);
      return row;
    },
  };
}

describe('NotificationService (unit)', () => {
  let service: NotificationService;
  let fake: ReturnType<typeof makeFake>;

  beforeEach(() => {
    fake = makeFake();
    service = new NotificationService(fake as unknown as PrismaService);
  });

  it('список: только свои, новые сверху, unread в ответе', async () => {
    fake.add('user-1');
    fake.add('user-1', true);
    fake.add('user-2');
    const result = await service.list('user-1', {});
    expect(result.total).toBe(2);
    expect(result.unread).toBe(1);
    expect(result.items[0].title).toBe('Уведомление 2');
    expect(result.hasMore).toBe(false);
  });

  it('список: фильтр unread=true — только непрочитанные', async () => {
    fake.add('user-1');
    fake.add('user-1', true);
    const result = await service.list('user-1', { unread: true });
    expect(result.total).toBe(1);
    expect(result.items[0].readAt).toBeNull();
  });

  it('список: payload разбирается из JSON, битый JSON — null', async () => {
    fake.add('user-1', false, '{"orderId":"order-1"}');
    fake.add('user-1', false, '{битый json');
    const result = await service.list('user-1', {});
    expect(result.items[1].payload).toEqual({ orderId: 'order-1' });
    expect(result.items[0].payload).toBeNull();
  });

  it('unreadCount: считает только null readAt', async () => {
    fake.add('user-1');
    fake.add('user-1', true);
    fake.add('user-1');
    expect((await service.unreadCount('user-1')).unread).toBe(2);
    expect((await service.unreadCount('user-2')).unread).toBe(0);
  });

  it('markRead: ставит readAt, повторный вызов идемпотентен', async () => {
    const row = fake.add('user-1');
    const first = await service.markRead('user-1', row.id);
    expect(first.readAt).not.toBeNull();
    const again = await service.markRead('user-1', row.id);
    expect(again.readAt).toEqual(first.readAt);
  });

  it('markRead: чужое уведомление — 404', async () => {
    const row = fake.add('user-2');
    await expect(service.markRead('user-1', row.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('markAllRead: обновляет все непрочитанные, счётчик в ответе', async () => {
    fake.add('user-1');
    fake.add('user-1');
    fake.add('user-1', true);
    const result = await service.markAllRead('user-1');
    expect(result.updated).toBe(2);
    expect((await service.unreadCount('user-1')).unread).toBe(0);
  });

  it('markAllRead: нечего читать — 400 NOTHING_TO_READ', async () => {
    fake.add('user-1', true);
    await expect(service.markAllRead('user-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
