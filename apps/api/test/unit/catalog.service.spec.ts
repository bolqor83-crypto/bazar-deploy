/**
 * Unit-тесты CatalogService (Промт 8, Часть C): категории, поиск
 * (кириллица, регистр), фильтры цены, сортировки, пагинация,
 * деталь с предложениями, ошибки 404.
 */
import { CatalogService } from '../../src/catalog/catalog.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { FakePrisma } from './fake-prisma';

describe('CatalogService (unit)', () => {
  let service: CatalogService;
  let prisma: FakePrisma;
  let vegetablesId: string;
  let fruitsId: string;
  let orgSouthId: string;
  let orgHomeId: string;

  /** Мини-мир: 2 категории, 3 товара, предложения двух продавцов. */
  beforeEach(async () => {
    prisma = new FakePrisma();
    service = new CatalogService(prisma as unknown as PrismaService);

    const vegetables = await prisma.category.create({
      data: { slug: 'vegetables', name: 'Овощи', icon: 'Carrot', sortOrder: 1 },
    });
    const fruits = await prisma.category.create({
      data: { slug: 'fruits', name: 'Фрукты', icon: 'Apple', sortOrder: 2 },
    });
    vegetablesId = vegetables.id;
    fruitsId = fruits.id;

    const south = await prisma.organization.create({
      data: { name: 'Опт-Юг', type: 'WHOLESALE' },
    });
    const home = await prisma.organization.create({
      data: { name: 'Сеть «У дома»', type: 'RETAIL' },
    });
    orgSouthId = south.id;
    orgHomeId = home.id;

    const tomatoes = await prisma.product.create({
      data: {
        categoryId: vegetablesId,
        name: 'Помидоры розовые',
        unit: '1 кг',
        description: 'Розовые томаты грунтовые.',
        images: '["https://picsum.photos/seed/a/800/600"]',
      },
    });
    const cucumbers = await prisma.product.create({
      data: {
        categoryId: vegetablesId,
        name: 'Огурцы гладкие',
        unit: '1 кг',
        description: 'Гладкие огурцы.',
        images: '[]',
      },
    });
    const apples = await prisma.product.create({
      data: {
        categoryId: fruitsId,
        name: 'Яблоки Гала',
        unit: '1 кг',
        description: 'Яблоки сладкие.',
        images: '[]',
      },
    });

    // Помидоры: два предложения — «Опт-Юг» дешевле.
    await prisma.productOffer.create({
      data: {
        productId: tomatoes.id,
        organizationId: orgSouthId,
        priceKopecks: 18900,
        stock: 50,
        minQuantity: 5,
        badge: 'hit',
        isPerishable: true,
      },
    });
    await prisma.productOffer.create({
      data: {
        productId: tomatoes.id,
        organizationId: orgHomeId,
        priceKopecks: 23700,
        stock: 20,
        minQuantity: 1,
        badge: null,
        isPerishable: true,
      },
    });
    // Огурцы: одно предложение.
    await prisma.productOffer.create({
      data: {
        productId: cucumbers.id,
        organizationId: orgSouthId,
        priceKopecks: 10400,
        stock: 120,
        minQuantity: 1,
        badge: null,
        isPerishable: false,
      },
    });
    // Яблоки: без предложений (витрина может быть пустой у товара).
    void apples;
  });

  describe('categories', () => {
    it('возвращает категории по порядку с числом товаров', async () => {
      const categories = await service.categories();
      expect(categories).toHaveLength(2);
      expect(categories[0]).toMatchObject({
        slug: 'vegetables',
        name: 'Овощи',
        icon: 'Carrot',
        productCount: 2,
      });
      expect(categories[1]).toMatchObject({
        slug: 'fruits',
        name: 'Фрукты',
        productCount: 1,
      });
    });
  });

  describe('list', () => {
    it('popular: больше предложений выше, затем по алфавиту', async () => {
      const list = await service.list({ sort: 'popular' });
      expect(list.items.map((p) => p.name)).toEqual([
        'Помидоры розовые',
        'Огурцы гладкие',
        'Яблоки Гала',
      ]);
      expect(list.total).toBe(3);
    });

    it('bestOffer — самое дешёвое предложение с продавцом', async () => {
      const list = await service.list({ q: 'помидоры' });
      expect(list.items).toHaveLength(1);
      const tomatoes = list.items[0];
      expect(tomatoes.bestOffer).toMatchObject({
        priceKopecks: 18900,
        organization: { name: 'Опт-Юг' },
        badge: 'hit',
        isPerishable: true,
      });
      expect(tomatoes.offersCount).toBe(2);
    });

    it('поиск регистронезависим для кириллицы', async () => {
      const upper = await service.list({ q: 'ПОМИДОРЫ' });
      const lower = await service.list({ q: 'помидоры' });
      expect(upper.total).toBe(1);
      expect(lower.total).toBe(1);
    });

    it('поиск ищет и по описанию', async () => {
      const list = await service.list({ q: 'сладкие' });
      expect(list.items[0].name).toBe('Яблоки Гала');
    });

    it('фильтр по категории (slug)', async () => {
      const list = await service.list({ category: 'vegetables' });
      expect(list.total).toBe(2);
      expect(list.items.every((p) => p.category.slug === 'vegetables')).toBe(
        true,
      );
    });

    it('фильтр цены: рубли сравниваются с копейками лучшего оффера', async () => {
      const cheap = await service.list({ minPrice: 100, maxPrice: 150 });
      expect(cheap.items.map((p) => p.name)).toEqual(['Огурцы гладкие']);

      const expensive = await service.list({ minPrice: 150 });
      expect(expensive.items.map((p) => p.name)).toEqual(['Помидоры розовые']);
    });

    it('цена «до» отсекает товары без предложений', async () => {
      const list = await service.list({ maxPrice: 500 });
      expect(list.items).toHaveLength(2); // яблоки без офферов не прошли
    });

    it('сортировка price-asc / price-desc', async () => {
      const asc = await service.list({ sort: 'price-asc' });
      expect(asc.items.map((p) => p.name)).toEqual([
        'Огурцы гладкие',
        'Помидоры розовые',
        'Яблоки Гала', // без офферов — в конце
      ]);
      const desc = await service.list({ sort: 'price-desc' });
      expect(desc.items[0].name).toBe('Помидоры розовые');
      expect(desc.items[2].name).toBe('Яблоки Гала');
    });

    it('пагинация: страница, размер, hasMore', async () => {
      const page1 = await service.list({ page: 1, pageSize: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(3);
      expect(page1.hasMore).toBe(true);

      const page2 = await service.list({ page: 2, pageSize: 2 });
      expect(page2.items).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
    });

    it('ответ не протекает полями Prisma (createdAt, type)', async () => {
      const list = await service.list({});
      const raw = JSON.stringify(list);
      expect(raw).not.toContain('createdAt');
      expect(raw).not.toContain('"type"');
      expect(raw).not.toContain('organizationId');
    });
  });

  describe('detail', () => {
    it('товар с предложениями по возрастанию цены', async () => {
      const all = await service.list({});
      const tomatoes = all.items.find((p) => p.name === 'Помидоры розовые');
      const detail = await service.detail(tomatoes?.id as string);
      expect(detail.name).toBe('Помидоры розовые');
      expect(detail.category).toEqual({ slug: 'vegetables', name: 'Овощи' });
      expect(detail.images).toEqual(['https://picsum.photos/seed/a/800/600']);
      expect(detail.offers).toHaveLength(2);
      expect(detail.offers[0].priceKopecks).toBe(18900);
      expect(detail.offers[1].priceKopecks).toBe(23700);
    });

    it('несуществующий товар — 404 PRODUCT_NOT_FOUND', async () => {
      await expect(service.detail('nope')).rejects.toMatchObject({
        response: { code: 'PRODUCT_NOT_FOUND' },
      });
    });
  });

  describe('offers', () => {
    it('список предложений товара', async () => {
      const all = await service.list({});
      const cucumbers = all.items.find((p) => p.name === 'Огурцы гладкие');
      const offers = await service.offers(cucumbers?.id as string);
      expect(offers.items).toHaveLength(1);
      expect(offers.items[0].organization.name).toBe('Опт-Юг');
    });

    it('несуществующий товар — 404', async () => {
      await expect(service.offers('nope')).rejects.toMatchObject({
        response: { code: 'PRODUCT_NOT_FOUND' },
      });
    });
  });
});
