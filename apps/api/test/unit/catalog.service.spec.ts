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
    const tomatoSouth = await prisma.productOffer.create({
      data: {
        productId: tomatoes.id,
        organizationId: orgSouthId,
        priceKopecks: 18900,
        minQuantity: 5,
        badge: 'hit',
        isPerishable: true,
      },
    });
    const tomatoHome = await prisma.productOffer.create({
      data: {
        productId: tomatoes.id,
        organizationId: orgHomeId,
        priceKopecks: 23700,
        minQuantity: 1,
        badge: null,
        isPerishable: true,
      },
    });
    // Огурцы: одно предложение.
    const cucumberSouth = await prisma.productOffer.create({
      data: {
        productId: cucumbers.id,
        organizationId: orgSouthId,
        priceKopecks: 10400,
        minQuantity: 1,
        badge: null,
        isPerishable: false,
      },
    });
    // Промт 14a: бананы — другая категория с предложением (проверка
    // добора из остальных категорий в similar).
    const bananas = await prisma.product.create({
      data: {
        categoryId: fruitsId,
        name: 'Бананы',
        unit: '1 кг',
        description: 'Бананы первый сорт.',
        images: '[]',
      },
    });
    const bananaSouth = await prisma.productOffer.create({
      data: {
        productId: bananas.id,
        organizationId: orgSouthId,
        priceKopecks: 8900,
        minQuantity: 3,
        badge: null,
        isPerishable: true,
      },
    });
    // Промт 11: остатки — балансы (INITIAL).
    prisma.seedStock(tomatoSouth.id, 50);
    prisma.seedStock(tomatoHome.id, 20);
    prisma.seedStock(cucumberSouth.id, 120);
    prisma.seedStock(bananaSouth.id, 35);
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
        // Промт 14a: бананы присоединились к яблокам во фруктах.
        productCount: 2,
      });
    });
  });

  describe('list', () => {
    it('popular: больше предложений выше, затем по алфавиту', async () => {
      const list = await service.list({ sort: 'popular' });
      expect(list.items.map((p) => p.name)).toEqual([
        'Помидоры розовые',
        'Бананы',
        'Огурцы гладкие',
        'Яблоки Гала',
      ]);
      expect(list.total).toBe(4);
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
      // Яблоки без офферов не прошли; бананы (89 ₽) — прошли.
      expect(list.items).toHaveLength(3);
    });

    it('сортировка price-asc / price-desc', async () => {
      const asc = await service.list({ sort: 'price-asc' });
      expect(asc.items.map((p) => p.name)).toEqual([
        'Бананы',
        'Огурцы гладкие',
        'Помидоры розовые',
        'Яблоки Гала', // без офферов — в конце
      ]);
      const desc = await service.list({ sort: 'price-desc' });
      expect(desc.items[0].name).toBe('Помидоры розовые');
      expect(desc.items[3].name).toBe('Яблоки Гала');
    });

    it('пагинация: страница, размер, hasMore', async () => {
      const page1 = await service.list({ page: 1, pageSize: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(4);
      expect(page1.hasMore).toBe(true);

      const page2 = await service.list({ page: 2, pageSize: 2 });
      expect(page2.items).toHaveLength(2);
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

  describe('list: excludeId (Промт 14a)', () => {
    it('исключает товар из выдачи', async () => {
      const all = await service.list({});
      const tomatoes = all.items.find((p) => p.name === 'Помидоры розовые');
      const rest = await service.list({ excludeId: tomatoes?.id });
      expect(rest.items.map((p) => p.name)).not.toContain('Помидоры розовые');
      expect(rest.total).toBe(3);
    });

    it('невалидный excludeId игнорируется', async () => {
      const rest = await service.list({ excludeId: 'не-id!!!' });
      expect(rest.total).toBe(4);
    });
  });

  describe('similar (Промт 14a)', () => {
    it('та же категория раньше остальных, сам товар исключён', async () => {
      const all = await service.list({});
      const tomatoes = all.items.find((p) => p.name === 'Помидоры розовые');
      const similar = await service.similar(tomatoes?.id as string);
      const names = similar.items.map((p) => p.name);
      expect(names).not.toContain('Помидоры розовые');
      // Кандидаты с офферами: огурцы (овощи) и бананы (фрукты).
      expect(names).toHaveLength(2);
      // Овощи (огурцы) — раньше фруктов (бананы): приоритет категории.
      expect(names.indexOf('Огурцы гладкие')).toBeLessThan(
        names.indexOf('Бананы'),
      );
    });

    it('товар без предложений не попадает в похожие', async () => {
      const all = await service.list({});
      const tomatoes = all.items.find((p) => p.name === 'Помидоры розовые');
      const similar = await service.similar(tomatoes?.id as string);
      expect(similar.items.map((p) => p.name)).not.toContain('Яблоки Гала');
    });

    it('limit ограничивает выдачу', async () => {
      const all = await service.list({});
      const tomatoes = all.items.find((p) => p.name === 'Помидоры розовые');
      const similar = await service.similar(tomatoes?.id as string, 1);
      expect(similar.items).toHaveLength(1);
      // Единственный товар — из той же категории.
      expect(similar.items[0].category.slug).toBe('vegetables');
    });

    it('limit = 0 — значение по умолчанию, не ломает запрос', async () => {
      const all = await service.list({});
      const tomatoes = all.items.find((p) => p.name === 'Помидоры розовые');
      const similar = await service.similar(tomatoes?.id as string, 0);
      expect(similar.items).toHaveLength(2);
    });

    it('порядок детерминирован: два вызова дают одинаковый список', async () => {
      const all = await service.list({});
      const tomatoes = all.items.find((p) => p.name === 'Помидоры розовые');
      const first = await service.similar(tomatoes?.id as string);
      const second = await service.similar(tomatoes?.id as string);
      expect(first.items.map((p) => p.id)).toEqual(
        second.items.map((p) => p.id),
      );
    });

    it('карточки похожих несут те же поля, что листинг', async () => {
      const all = await service.list({});
      const tomatoes = all.items.find((p) => p.name === 'Помидоры розовые');
      const similar = await service.similar(tomatoes?.id as string);
      for (const item of similar.items) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('bestOffer');
        expect(item).toHaveProperty('offersCount');
        expect(item).toHaveProperty('images');
      }
    });

    it('несуществующий товар — 404 PRODUCT_NOT_FOUND', async () => {
      await expect(service.similar('nope')).rejects.toMatchObject({
        response: { code: 'PRODUCT_NOT_FOUND' },
      });
    });

    it('архивный исходный товар — 404 (как в detail)', async () => {
      const all = await service.list({});
      const apples = all.items.find((p) => p.name === 'Яблоки Гала');
      // Прямая мутация записи FakePrisma: archivedAt задан.
      const record = prisma.products.get(apples?.id ?? '') as {
        archivedAt?: unknown;
      };
      record.archivedAt = new Date();
      await expect(service.similar(apples?.id as string)).rejects.toMatchObject(
        {
          response: { code: 'PRODUCT_NOT_FOUND' },
        },
      );
    });

    it('архивные кандидаты не попадают в выдачу', async () => {
      const all = await service.list({});
      const bananas = all.items.find((p) => p.name === 'Бананы');
      const record = prisma.products.get(bananas?.id ?? '') as {
        archivedAt?: unknown;
      };
      record.archivedAt = new Date();
      const tomatoes = all.items.find((p) => p.name === 'Помидоры розовые');
      const similar = await service.similar(tomatoes?.id as string);
      expect(similar.items.map((p) => p.name)).not.toContain('Бананы');
    });

    it('excludeId работает вместе с фильтром категории', async () => {
      const all = await service.list({});
      const tomatoes = all.items.find((p) => p.name === 'Помидоры розовые');
      const rest = await service.list({
        category: 'vegetables',
        excludeId: tomatoes?.id,
      });
      expect(rest.items.map((p) => p.name)).toEqual(['Огурцы гладкие']);
    });
  });

  describe('detail', () => {
    it('товар с предложениями по возрастанию цены', async () => {
      const all = await service.list({});
      const tomatoes = all.items.find((p) => p.name === 'Помидоры розовые');
      const detail = await service.detail(tomatoes?.id as string);
      expect(detail.name).toBe('Помидоры розовые');
      expect(detail.category).toEqual({ slug: 'vegetables', name: 'Овощи' });
      // Стоковое фото из маппинга по имени (Промт 12): picsum из
      // сида заменяется на /api/media/seed/products/tomatoes.png.
      expect(detail.images).toEqual(['/api/media/seed/products/tomatoes.png']);
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
