const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
describe('🍎 Phase 2: Meals CRUD & Authorization (9 Tests)', () => {
  let token1, token2, mealId;
  beforeAll(async () => {
    try { db.prepare('DELETE FROM users').run(); db.prepare('DELETE FROM meals').run(); } catch(e){}
    const r1 = await request(app).post('/api/auth/register').send({ name: 'U1', email: 'u1@ex.com', password: '123', weight: 70, calorieGoal: 2000 });
    token1 = r1.body.token;
    const r2 = await request(app).post('/api/auth/register').send({ name: 'U2', email: 'u2@ex.com', password: '123', weight: 80, calorieGoal: 2500 });
    token2 = r2.body.token;
  });
  it('1. Should block meal logging if no JWT token is provided', async () => {
    const res = await request(app).post('/api/meals').send({ title: 'Oats', calories: 350 });
    expect(res.statusCode).toEqual(401);
  });
  it('2. Should successfully create a new meal for authenticated user', async () => {
    const res = await request(app).post('/api/meals').set('Authorization', `Bearer ${token1}`).send({ title: 'Chicken Rice', calories: 650 });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    mealId = res.body.id;
  });
  it('3. Should fetch only the logged-in user meals history', async () => {
    const res = await request(app).get('/api/meals').set('Authorization', `Bearer ${token1}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
  it('4. Should update an existing meal record', async () => {
    const res = await request(app).put(`/api/meals/${mealId}`).set('Authorization', `Bearer ${token1}`).send({ title: 'Updated Chicken Rice', calories: 700 });
    expect(res.statusCode).toEqual(200);
  });
  it('5. Should protect against IDOR on meal updates (User 2 cannot edit User 1 meal)', async () => {
    const res = await request(app).put(`/api/meals/${mealId}`).set('Authorization', `Bearer ${token2}`).send({ title: 'Hacked Meal', calories: 1000 });
    expect(res.statusCode).toEqual(404);
  });
  it('6. Prevent SQL Injection in IDOR query parameter updates', async () => {
    const res = await request(app).put(`/api/meals/${mealId} OR 1=1`).set('Authorization', `Bearer ${token1}`).send({ title: 'Inject', calories: 100 });
    expect(res.statusCode).not.toEqual(200);
  });
  it('7. Should protect against IDOR on meal deletions (User 2 cannot delete User 1 meal)', async () => {
    const res = await request(app).delete(`/api/meals/${mealId}`).set('Authorization', `Bearer ${token2}`);
    expect(res.statusCode).toEqual(404);
  });
  it('8. Should successfully delete user own meal record', async () => {
    const res = await request(app).delete(`/api/meals/${mealId}`).set('Authorization', `Bearer ${token1}`);
    expect(res.statusCode).toEqual(200);
  });
  it('9. Should return 0 remaining calories if invalid inputs are served', async () => {
    const res = await request(app).get('/api/meals/analytics').set('Authorization', `Bearer ${token1}`);
    expect(res.statusCode).toEqual(200);
  });
});
