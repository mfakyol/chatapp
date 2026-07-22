import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildTestApp, registerUser, auth } from './helpers';

let app: Express;
beforeEach(() => {
  app = buildTestApp();
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token without the password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'alice',
      email: 'alice@test.co',
      password: 'secret6',
      firstName: 'Al',
      lastName: 'Ice',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.username).toBe('alice');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('lowercases and trims username/email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'Alice',
      email: '  ALICE@Test.co ',
      password: 'secret6',
      firstName: 'Al',
      lastName: 'Ice',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('alice');
    expect(res.body.user.email).toBe('alice@test.co');
  });

  it('rejects an invalid username with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'a!',
      email: 'a@test.co',
      password: 'secret6',
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a short password with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'alice',
      email: 'alice@test.co',
      password: '123',
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser(app);
    const res = await request(app).post('/api/auth/register').send({
      username: 'alice2',
      email: 'alice@test.co',
      password: 'secret6',
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    await registerUser(app);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'alice', password: 'secret6' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf('string');
  });

  it('rejects a wrong password with 401', async () => {
    await registerUser(app);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'alice', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user with a valid token', async () => {
    const { token, user } = await registerUser(app);
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });
});
