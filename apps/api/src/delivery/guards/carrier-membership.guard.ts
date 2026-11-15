/**
 * Guard членства CARRIER (Промт 10, Часть D).
 *
 * Активная организация-перевозчик передаётся заголовком
 * X-Organization-Id. Guard проверяет membership (userId,
 * organizationId, CARRIER) и кладёт контекст перевозчика в
 * request для сервисов.
 */
import {
  CanActivate,
  ExecutionContext,
  createParamDecorator,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/filters/api-error';

export interface CarrierContext {
  userId: string;
  organizationId: string;
}

export const CARRIER_CONTEXT = 'carrierContext';

@Injectable()
export class CarrierMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { userId: string };
      headers: Record<string, string | string[] | undefined>;
      [CARRIER_CONTEXT]?: CarrierContext;
    }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'AUTH_UNAUTHORIZED', 'Требуется вход');
    }
    const header = request.headers['x-organization-id'];
    const organizationId = Array.isArray(header) ? header[0] : header;
    if (!organizationId) {
      throw new ApiError(
        400,
        'CARRIER_NO_ORGANIZATION',
        'Не выбрана организация перевозчика',
      );
    }
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        organizationId,
        role: 'CARRIER',
      },
      select: { id: true },
    });
    if (!membership) {
      throw new ApiError(
        403,
        'CARRIER_FORBIDDEN',
        'Нет прав перевозчика в этой организации',
      );
    }
    request[CARRIER_CONTEXT] = { userId, organizationId };
    return true;
  }
}

/** Контекст перевозчика (userId + organizationId после guard). */
export const CurrentCarrier = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CarrierContext => {
    return ctx.switchToHttp().getRequest()[CARRIER_CONTEXT];
  },
);
