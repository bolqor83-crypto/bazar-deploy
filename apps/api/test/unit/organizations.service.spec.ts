/**
 * Unit-тесты OrganizationsService: создание с владельцем, права на
 * точки, изоляция чужих организаций.
 */
import { OrganizationsService } from '../../src/organizations/organizations.service';
import { AppLogger } from '../../src/common/app-logger';
import { PrismaService } from '../../src/prisma/prisma.service';
import { FakePrisma } from './fake-prisma';

describe('OrganizationsService (unit)', () => {
  let service: OrganizationsService;
  let prisma: FakePrisma;
  let userId: string;

  beforeEach(async () => {
    prisma = new FakePrisma();
    service = new OrganizationsService(
      prisma as unknown as PrismaService,
      new AppLogger(),
    );
    const user = await prisma.user.create({
      data: { phone: '+79001112233', name: 'Мария', passwordHash: 'stub' },
    });
    userId = user.id;
  });

  describe('create', () => {
    it('RETAIL: организация + членство владельца STORE_OWNER', async () => {
      const org = await service.create(userId, {
        name: 'Магазин «Весна»',
        type: 'RETAIL',
      });
      expect(org.name).toBe('Магазин «Весна»');
      expect(org.shortName).toBe('Весна');
      expect(org.kind).toBe('retail');
      expect(org.role).toBe('store_owner');
      expect(
        [...prisma.memberships.values()].filter(
          (m) => m.organizationId === org.id,
        ),
      ).toHaveLength(1);
    });

    it('WHOLESALE: владелец WHOLESALE_SELLER', async () => {
      const org = await service.create(userId, {
        name: 'Опт-Север',
        type: 'WHOLESALE',
      });
      expect(org.role).toBe('wholesale_seller');
    });

    it('LOGISTICS: владелец CARRIER', async () => {
      const org = await service.create(userId, {
        name: 'Транс-Логистик',
        type: 'LOGISTICS',
      });
      expect(org.role).toBe('carrier');
    });
  });

  describe('createLocation', () => {
    it('создаёт точку владельцу RETAIL-организации', async () => {
      const org = await service.create(userId, {
        name: 'Магазин «Весна»',
        type: 'RETAIL',
      });
      const location = await service.createLocation(userId, org.id, {
        name: 'Точка на Западном',
        address: 'ул. Западная, 1',
        city: 'Ростов-на-Дону',
      });
      expect(location.organizationId).toBe(org.id);
      expect(location.shortName).toBe('Точка на Западном');
      expect(location.city).toBe('Ростов-на-Дону');
    });

    it('отказывает для не-RETAIL организации', async () => {
      const org = await service.create(userId, {
        name: 'Опт-Север',
        type: 'WHOLESALE',
      });
      await expect(
        service.createLocation(userId, org.id, {
          name: 'Точка',
          address: 'ул. Западная, 1',
          city: 'Ростов-на-Дону',
        }),
      ).rejects.toMatchObject({ code: 'ORG_NOT_RETAIL' });
    });

    it('отказывает не-владельцу (членство без STORE_OWNER)', async () => {
      const org = await service.create(userId, {
        name: 'Магазин «Весна»',
        type: 'RETAIL',
      });
      const other = await prisma.user.create({
        data: { phone: '+79009998877', name: 'Пётр', passwordHash: 'stub' },
      });
      // Членство есть, но не STORE_OWNER — точки создавать нельзя.
      await prisma.membership.create({
        data: {
          userId: other.id,
          organizationId: org.id,
          role: 'CUSTOMER',
        },
      });
      await expect(
        service.createLocation(other.id, org.id, {
          name: 'Точка',
          address: 'ул. Западная, 1',
          city: 'Ростов-на-Дону',
        }),
      ).rejects.toMatchObject({ code: 'ORG_FORBIDDEN' });
    });
  });

  describe('изоляция', () => {
    it('чужая организация — 404, без раскрытия', async () => {
      const org = await service.create(userId, {
        name: 'Магазин «Весна»',
        type: 'RETAIL',
      });
      const stranger = await prisma.user.create({
        data: { phone: '+79009998877', name: 'Пётр', passwordHash: 'stub' },
      });
      await expect(
        service.getForUser(stranger.id, org.id),
      ).rejects.toMatchObject({ code: 'ORG_NOT_FOUND' });
      await expect(
        service.listLocations(stranger.id, org.id),
      ).rejects.toMatchObject({ code: 'ORG_NOT_FOUND' });
    });

    it('участник видит детали и точки', async () => {
      const org = await service.create(userId, {
        name: 'Магазин «Весна»',
        type: 'RETAIL',
      });
      await service.createLocation(userId, org.id, {
        name: 'Точка на Западном',
        address: 'ул. Западная, 1',
        city: 'Ростов-на-Дону',
      });
      const details = await service.getForUser(userId, org.id);
      expect(details.locations).toHaveLength(1);
      expect(details.members[0].role).toBe('store_owner');
      const list = await service.listLocations(userId, org.id);
      expect(list).toHaveLength(1);
    });

    it('чужая точка — 404', async () => {
      const org = await service.create(userId, {
        name: 'Магазин «Весна»',
        type: 'RETAIL',
      });
      const location = await service.createLocation(userId, org.id, {
        name: 'Точка на Западном',
        address: 'ул. Западная, 1',
        city: 'Ростов-на-Дону',
      });
      const stranger = await prisma.user.create({
        data: { phone: '+79009998877', name: 'Пётр', passwordHash: 'stub' },
      });
      await expect(
        service.getLocationForUser(stranger.id, location.id),
      ).rejects.toMatchObject({ code: 'LOCATION_NOT_FOUND' });
      await expect(
        service.getLocationForUser(userId, location.id),
      ).resolves.toMatchObject({ name: 'Точка на Западном' });
    });
  });
});
