const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
describe('🔑 Phase 1: Authentication & Security (6 Tests)', () => {
  beforeEach(() => { try { db.prepare('DELETE FROM users').run(); } catch (e) {} });
  it('1. Should successfully register a new user with health metrics', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Rayan', email: 'rayan@example.com', password: 'SecurePassword123', weight: 75, calorieGoal: 2000 });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
  });
  it('2. Should fail registration if email is already taken', async () => {
    try { db.prepare("INSERT INTO users (name, email, password, weight, calorie_goal) VALUES ('User', 'dup@example.com', '123', 70, 2000)").run(); } catch(e){}
    const res = await request(app).post('/api/auth/register').send({ name: 'Rayan', email: 'dup@example.com', password: '123', weight: 70, calorieGoal: 2000 });
    expect(res.statusCode).toEqual(400);
  });
  it('3. Should successfully login and return a JWT token', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Rayan', email: 'login@example.com', password: 'password123', weight: 75, calorieGoal: 2000 });
    const res = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'password123' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });
  it('4. Should fail login with incorrect password', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Rayan', email: 'wrong@example.com', password: 'password123', weight: 75, calorieGoal: 2000 });
    const res = await request(app).post('/api/auth/login').send({ email: 'wrong@example.com', password: 'wrongpassword' });
    expect(res.statusCode).toEqual(401);
  });
  it('5. Should prevent SQL Injection on the login endpoint', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: "' OR '1'='1", password: "' OR '1'='1" });
    expect(res.statusCode).toEqual(401);
  });
  it('6. Should trigger 429 Too Many Requests on the 6th failed login attempt (Brute-Force)', async () => {
    for (let i = 0; i < 5; i++) { await request(app).post('/api/auth/login').send({ email: 'brute@example.com', password: 'wrong' }); }
    const res = await request(app).post('/api/auth/login').send({ email: 'brute@example.com', password: 'wrong' });
    expect(res.statusCode).toEqual(429);
  });
});
