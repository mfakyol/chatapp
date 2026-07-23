import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildTestApp, registerUser } from './helpers';

let app: Express;
beforeEach(() => {
  app = buildTestApp();
});

describe('POST /api/auth/register', () => {
  it('creates a user, sets a session cookie, and never exposes the password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'alice',
      email: 'alice@test.co',
      password: 'secret6',
      firstName: 'Al',
      lastName: 'Ice',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('alice');
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('token');
    const cookies = res.headers['set-cookie'];
    expect(cookies?.some((c: string) => c.startsWith('sid=') && c.includes('HttpOnly'))).toBe(true);
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
  it('logs in with valid credentials and starts a session', async () => {
    await registerUser(app);
    const agent = request.agent(app);
    const res = await agent
      .post('/api/auth/login')
      .send({ identifier: 'alice', password: 'secret6' });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('alice');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('alice');
  });

  it('rejects a wrong password with 401', async () => {
    await registerUser(app);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'alice', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});

describe('session lifecycle', () => {
  it('returns 401 without a session cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('register establishes a working session (cookie jar)', async () => {
    const { agent, user } = await registerUser(app);
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('logout destroys the session', async () => {
    const { agent } = await registerUser(app);
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });
});
