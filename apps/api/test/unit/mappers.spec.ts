/**
 * Unit-тесты мапперов: shortName, роли, kinds.
 */
import {
  shortNameOf,
  toOrganizationResponse,
  toUserResponse,
} from '../../src/common/mappers';

describe('mappers (unit)', () => {
  describe('shortNameOf', () => {
    it.each([
      ['Опт-Юг', 'Опт-Юг'],
      ['Сеть «У дома»', 'У дома'],
      ['Магазин «Ромашка»', 'Ромашка'],
      ['Транс-Логистик', 'Транс-Логистик'],
      // Точки — целиком: склонение не автоматизируем (ADR 0008).
      ['Точка на Садовой', 'Точка на Садовой'],
      ['Точка на Доватора', 'Точка на Доватора'],
      ['Точка в Аксае', 'Точка в Аксае'],
      ['Ромашка — главный зал', 'Главный зал'],
    ])('%s → %s', (input, expected) => {
      expect(shortNameOf(input)).toBe(expected);
    });

    it('обрезает длинные названия до 24 символов', () => {
      const long = 'Очень длинное название организации для проверки обрезки';
      expect(shortNameOf(long)).toHaveLength(24);
      expect(shortNameOf(long).endsWith('…')).toBe(true);
    });
  });

  describe('toOrganizationResponse', () => {
    it('отдаёт kind в нижнем регистре и type как есть', () => {
      const response = toOrganizationResponse({
        id: 'o1',
        name: 'Опт-Юг',
        type: 'WHOLESALE',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });
      expect(response.kind).toBe('wholesale');
      expect(response.type).toBe('WHOLESALE');
      expect(response.shortName).toBe('Опт-Юг');
    });
  });

  describe('toUserResponse', () => {
    it('маппит роли в нижний регистр и добавляет title', () => {
      const response = toUserResponse(
        {
          id: 'u1',
          phone: '+79001112233',
          name: 'Мария',
          passwordHash: 'секрет',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
          memberships: [
            {
              id: 'm1',
              userId: 'u1',
              organizationId: 'o1',
              role: 'STORE_OWNER',
              createdAt: new Date('2026-01-01T00:00:00Z'),
              updatedAt: new Date('2026-01-01T00:00:00Z'),
              organization: {
                id: 'o1',
                name: 'Сеть «У дома»',
                type: 'RETAIL',
                createdAt: new Date('2026-01-01T00:00:00Z'),
                updatedAt: new Date('2026-01-01T00:00:00Z'),
              },
            },
          ],
        },
        new Map([]),
      );
      expect(response.memberships[0].role).toBe('store_owner');
      expect(response.memberships[0].title).toBe('Владелец');
      expect(response.memberships[0].organization.shortName).toBe('У дома');
      // Хеш пароля не попадает в ответ.
      expect(JSON.stringify(response)).not.toContain('секрет');
    });
  });
});
