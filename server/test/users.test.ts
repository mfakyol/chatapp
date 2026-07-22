import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildTestApp, registerUser, auth } from './helpers';

let app: Express;
beforeEach(() => {
  app = buildTestApp();
});

describe('friend requests', () => {
  it('sends, lists, and accepts a friend request', async () => {
    const a = await registerUser(app, { username: 'alice', email: 'alice@test.co' });
    const b = await registerUser(app, { username: 'bob', email: 'bob@test.co' });

    const sent = await request(app)
      .post('/api/users/friend-requests/bob')
      .set(auth(a.token));
    expect(sent.status).toBe(201);

    const received = await request(app)
      .get('/api/users/friend-requests')
      .set(auth(b.token));
    expect(received.status).toBe(200);
    expect(received.body.received.map((u: { username: string }) => u.username)).toContain('alice');

    const accepted = await request(app)
      .post('/api/users/friend-requests/alice/accept')
      .set(auth(b.token));
    expect(accepted.status).toBe(200);

    const friends = await request(app).get('/api/users/friends').set(auth(a.token));
    expect(friends.body.friends.map((u: { username: string }) => u.username)).toContain('bob');
  });

  it('auto-accepts when both send to each other', async () => {
    const a = await registerUser(app, { username: 'alice', email: 'alice@test.co' });
    const b = await registerUser(app, { username: 'bob', email: 'bob@test.co' });

    await request(app).post('/api/users/friend-requests/bob').set(auth(a.token));
    const res = await request(app).post('/api/users/friend-requests/alice').set(auth(b.token));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/accepted/i);

    const friends = await request(app).get('/api/users/friends').set(auth(b.token));
    expect(friends.body.friends.map((u: { username: string }) => u.username)).toContain('alice');
  });

  it('returns 404 for an unknown target', async () => {
    const a = await registerUser(app);
    const res = await request(app)
      .post('/api/users/friend-requests/ghost')
      .set(auth(a.token));
    expect(res.status).toBe(404);
  });

  it('returns 400 when adding yourself', async () => {
    const a = await registerUser(app, { username: 'alice', email: 'alice@test.co' });
    const res = await request(app)
      .post('/api/users/friend-requests/alice')
      .set(auth(a.token));
    expect(res.status).toBe(400);
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/users/friends');
    expect(res.status).toBe(401);
  });
});
