/**
 * E2E организаций и точек: CRUD-флоу и изоляция пользователей.
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  registerUser,
  type TestApp,
} from './test-app';

describe('Организации (e2e)', () => {
  let testApp: TestApp;
  let alice: { accessToken: string };
  let bob: { accessToken: string };

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await clearDatabase(testApp.prisma);
    alice = await registerUser(testApp.server, '+79001112233', 'Алиса');
    bob = await registerUser(testApp.server, '+79009998877', 'Борис');
  });

  it('полный флоу: создать организацию → точку → прочитать', async () => {
    const created = await request(testApp.server)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ name: 'Сеть «У дома»', type: 'RETAIL' });
    expect(created.status).toBe(201);
    expect(created.body.shortName).toBe('У дома');
    expect(created.body.role).toBe('store_owner');
    const orgId = created.body.id;

    const location = await request(testApp.server)
      .post(`/api/organizations/${orgId}/locations`)
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({
        name: 'Точка на Садовой',
        address: 'ул. Садовая, 12',
        city: 'Ростов-на-Дону',
      });
    expect(location.status).toBe(201);
    expect(location.body.city).toBe('Ростов-на-Дону');

    // Список организаций пользователя: с членством и точками.
    const list = await request(testApp.server)
      .get('/api/organizations')
      .set('Authorization', `Bearer ${alice.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].organization.name).toBe('Сеть «У дома»');
    expect(list.body[0].locations).toHaveLength(1);

    // Детали организации: участники и точки.
    const details = await request(testApp.server)
      .get(`/api/organizations/${orgId}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);
    expect(details.status).toBe(200);
    expect(details.body.members[0].name).toBe('Алиса');
    expect(details.body.locations[0].name).toBe('Точка на Садовой');

    // Детали точки.
    const locationDetails = await request(testApp.server)
      .get(`/api/locations/${location.body.id}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);
    expect(locationDetails.status).toBe(200);
    expect(locationDetails.body.address).toBe('ул. Садовая, 12');
  });

  it('изоляция: Борис не видит организацию Алисы', async () => {
    const created = await request(testApp.server)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ name: 'Опт-Юг', type: 'WHOLESALE' });
    const orgId = created.body.id;

    const list = await request(testApp.server)
      .get('/api/organizations')
      .set('Authorization', `Bearer ${bob.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(0);

    const details = await request(testApp.server)
      .get(`/api/organizations/${orgId}`)
      .set('Authorization', `Bearer ${bob.accessToken}`);
    expect(details.status).toBe(404);
    expect(details.body.code).toBe('ORG_NOT_FOUND');

    const locations = await request(testApp.server)
      .get(`/api/organizations/${orgId}/locations`)
      .set('Authorization', `Bearer ${bob.accessToken}`);
    expect(locations.status).toBe(404);

    // Борис не может создать точку в организации Алисы.
    const foreignLocation = await request(testApp.server)
      .post(`/api/organizations/${orgId}/locations`)
      .set('Authorization', `Bearer ${bob.accessToken}`)
      .send({ name: 'Точка', address: 'ул. Ленина, 1', city: 'Аксай' });
    expect(foreignLocation.status).toBe(404);
  });

  it('точка только для RETAIL: WHOLESALE — 400', async () => {
    const created = await request(testApp.server)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ name: 'Опт-Юг', type: 'WHOLESALE' });
    const orgId = created.body.id;

    const rejected = await request(testApp.server)
      .post(`/api/organizations/${orgId}/locations`)
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ name: 'Точка', address: 'ул. Ленина, 1', city: 'Аксай' });
    expect(rejected.status).toBe(400);
    expect(rejected.body.code).toBe('ORG_NOT_RETAIL');
  });

  it('без токена организации недоступны', async () => {
    const list = await request(testApp.server).get('/api/organizations');
    expect(list.status).toBe(401);
  });

  it('users/me отдаёт профиль без токенов', async () => {
    const profile = await request(testApp.server)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${alice.accessToken}`);
    expect(profile.status).toBe(200);
    expect(profile.body.name).toBe('Алиса');
    expect(profile.body.accessToken).toBeUndefined();
  });
});
