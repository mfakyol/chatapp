import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import Conversation from '../src/models/Conversation';
import Message from '../src/models/Message';
import { buildTestApp, registerUser, makeFriends, auth } from './helpers';

let app: Express;
beforeEach(() => {
  app = buildTestApp();
});

describe('POST /api/conversations/direct', () => {
  it('creates a direct conversation between friends', async () => {
    const { a } = await makeFriends(app);
    const res = await request(app)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'bob' });

    expect(res.status).toBe(201);
    expect(res.body.conversation.isGroup).toBe(false);
    expect(res.body.conversation.participants).toHaveLength(2);
  });

  it('is idempotent (returns the same conversation on repeat)', async () => {
    const { a } = await makeFriends(app);
    const first = await request(app)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'bob' });
    const second = await request(app)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'bob' });
    expect(second.body.conversation._id).toBe(first.body.conversation._id);
  });

  it('rejects messaging a non-friend with 403', async () => {
    const a = await registerUser(app, { username: 'alice', email: 'alice@test.co' });
    await registerUser(app, { username: 'carol', email: 'carol@test.co' });
    const res = await request(app)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'carol' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown user', async () => {
    const a = await registerUser(app);
    const res = await request(app)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'ghost' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/conversations/:id/messages', () => {
  it('rejects an invalid ObjectId with 400', async () => {
    const a = await registerUser(app);
    const res = await request(app)
      .get('/api/conversations/not-an-id/messages')
      .set(auth(a.token));
    expect(res.status).toBe(400);
  });

  it('returns an empty list for a new conversation', async () => {
    const { a } = await makeFriends(app);
    const convo = await request(app)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'bob' });

    const res = await request(app)
      .get(`/api/conversations/${convo.body.conversation._id}/messages`)
      .set(auth(a.token));
    expect(res.status).toBe(200);
    expect(res.body.messages).toEqual([]);
  });

  it('returns 404 for a conversation the user is not part of', async () => {
    const { a } = await makeFriends(app);
    const convo = await request(app)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'bob' });

    const outsider = await registerUser(app, { username: 'carol', email: 'carol@test.co' });
    const res = await request(app)
      .get(`/api/conversations/${convo.body.conversation._id}/messages`)
      .set(auth(outsider.token));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/conversations/group', () => {
  it('rejects a group with fewer than 2 other members (400)', async () => {
    const { a } = await makeFriends(app);
    const res = await request(app)
      .post('/api/conversations/group')
      .set(auth(a.token))
      .send({ name: 'Squad', usernames: ['bob'] });
    expect(res.status).toBe(400);
  });

  it('creates a group of friends', async () => {
    const a = await registerUser(app, { username: 'alice', email: 'alice@test.co' });
    const b = await registerUser(app, { username: 'bob', email: 'bob@test.co' });
    const c = await registerUser(app, { username: 'carol', email: 'carol@test.co' });
    // alice befriends both
    for (const name of ['bob', 'carol']) {
      await request(app).post(`/api/users/friend-requests/${name}`).set(auth(a.token));
    }
    await request(app).post('/api/users/friend-requests/alice/accept').set(auth(b.token));
    await request(app).post('/api/users/friend-requests/alice/accept').set(auth(c.token));

    const res = await request(app)
      .post('/api/conversations/group')
      .set(auth(a.token))
      .send({ name: 'Squad', usernames: ['bob', 'carol'] });

    expect(res.status).toBe(201);
    expect(res.body.conversation.isGroup).toBe(true);
    expect(res.body.conversation.participants).toHaveLength(3);
  });
});

describe('DELETE /api/conversations/:id', () => {
  it('deletes the conversation and cascades its messages', async () => {
    const { a } = await makeFriends(app);
    const created = await request(app)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'bob' });
    const convoId = created.body.conversation._id;

    await Message.create({
      conversation: convoId,
      sender: a.user.id,
      content: 'to be deleted',
      readBy: [{ user: a.user.id, readAt: new Date() }],
    });

    const res = await request(app)
      .delete(`/api/conversations/${convoId}`)
      .set(auth(a.token));
    expect(res.status).toBe(200);

    expect(await Conversation.findById(convoId)).toBeNull();
    expect(await Message.countDocuments({ conversation: convoId })).toBe(0);
  });

  it('returns 404 for a non-participant', async () => {
    const { a } = await makeFriends(app);
    const created = await request(app)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'bob' });

    const outsider = await registerUser(app, { username: 'carol', email: 'carol@test.co' });
    const res = await request(app)
      .delete(`/api/conversations/${created.body.conversation._id}`)
      .set(auth(outsider.token));
    expect(res.status).toBe(404);
  });
});
