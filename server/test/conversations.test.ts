import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import Conversation from '../src/models/Conversation';
import ConversationMember from '../src/models/ConversationMember';
import Message from '../src/models/Message';
import { buildTestApp, registerUser, makeFriends, auth, recordingIo } from './helpers';

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
    expect(res.body.conversation.members).toHaveLength(2);
  });

  it('is idempotent (directKey upsert returns the same conversation)', async () => {
    const { a, b } = await makeFriends(app);
    const first = await request(app)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'bob' });
    // Second create from the OTHER side must also hit the same conversation.
    const second = await request(app)
      .post('/api/conversations/direct')
      .set(auth(b.token))
      .send({ username: 'alice' });
    expect(second.body.conversation._id).toBe(first.body.conversation._id);
    expect(await Conversation.countDocuments({})).toBe(1);
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

  // Regression: delivery is addressed to user rooms resolved from the DB, and
  // both participants must be announced the new conversation immediately.
  it('announces conversation:new to both participants user rooms', async () => {
    const rec = recordingIo();
    const recApp = buildTestApp(rec.io);
    const { a, b } = await makeFriends(recApp);

    await request(recApp)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'bob' });

    const announce = rec.emits.find((e) => e.event === 'conversation:new');
    expect(announce).toBeDefined();
    expect(announce!.rooms.sort()).toEqual([`user:${a.user.id}`, `user:${b.user.id}`].sort());
  });
});

describe('messages', () => {
  async function directConvo(x: Express, token: string) {
    const res = await request(x)
      .post('/api/conversations/direct')
      .set(auth(token))
      .send({ username: 'bob' });
    return res.body.conversation._id as string;
  }

  it('sends a message via REST and delivers to all member rooms', async () => {
    const rec = recordingIo();
    const recApp = buildTestApp(rec.io);
    const { a, b } = await makeFriends(recApp);
    const convoId = await directConvo(recApp, a.token);

    const res = await request(recApp)
      .post(`/api/conversations/${convoId}/messages`)
      .set(auth(a.token))
      .send({ content: 'hello', clientTempId: 'tmp-1' });

    expect(res.status).toBe(201);
    expect(res.body.message.content).toBe('hello');
    expect(res.body.message.clientTempId).toBe('tmp-1');

    const delivery = rec.emits.find((e) => e.event === 'message:new');
    expect(delivery).toBeDefined();
    expect(delivery!.rooms.sort()).toEqual([`user:${a.user.id}`, `user:${b.user.id}`].sort());
  });

  it('is idempotent on clientTempId (retry does not duplicate)', async () => {
    const { a } = await makeFriends(app);
    const convoId = await directConvo(app, a.token);

    const send = () =>
      request(app)
        .post(`/api/conversations/${convoId}/messages`)
        .set(auth(a.token))
        .send({ content: 'once', clientTempId: 'retry-1' });

    const first = await send();
    const second = await send();
    expect(second.body.message._id).toBe(first.body.message._id);
    expect(await Message.countDocuments({ conversation: convoId })).toBe(1);
  });

  it('rejects a send from a non-member with 404', async () => {
    const { a } = await makeFriends(app);
    const convoId = await directConvo(app, a.token);
    const outsider = await registerUser(app, { username: 'carol', email: 'carol@test.co' });

    const res = await request(app)
      .post(`/api/conversations/${convoId}/messages`)
      .set(auth(outsider.token))
      .send({ content: 'sneak' });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid ObjectId with 400', async () => {
    const a = await registerUser(app);
    const res = await request(app)
      .get('/api/conversations/not-an-id/messages')
      .set(auth(a.token));
    expect(res.status).toBe(400);
  });

  it('marks read via lastReadAt pointer and reports unread counts', async () => {
    const { a, b } = await makeFriends(app);
    const convoId = await directConvo(app, a.token);

    await request(app)
      .post(`/api/conversations/${convoId}/messages`)
      .set(auth(a.token))
      .send({ content: 'one' });
    await request(app)
      .post(`/api/conversations/${convoId}/messages`)
      .set(auth(a.token))
      .send({ content: 'two' });

    let list = await request(app).get('/api/conversations').set(auth(b.token));
    expect(list.body.conversations[0].unreadCount).toBe(2);

    const read = await request(app)
      .post(`/api/conversations/${convoId}/read`)
      .set(auth(b.token));
    expect(read.status).toBe(200);

    list = await request(app).get('/api/conversations').set(auth(b.token));
    expect(list.body.conversations[0].unreadCount).toBe(0);

    const member = await ConversationMember.findOne({ conversation: convoId, user: b.user.id });
    expect(member!.lastReadAt.getTime()).toBeGreaterThan(0);
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

  it('creates a group of friends with the creator as admin', async () => {
    const a = await registerUser(app, { username: 'alice', email: 'alice@test.co' });
    const b = await registerUser(app, { username: 'bob', email: 'bob@test.co' });
    const c = await registerUser(app, { username: 'carol', email: 'carol@test.co' });
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
    expect(res.body.conversation.admins).toEqual([a.user.id]);
  });
});

describe('DELETE /api/conversations/:id', () => {
  it('deletes the conversation and cascades messages + memberships', async () => {
    const { a } = await makeFriends(app);
    const created = await request(app)
      .post('/api/conversations/direct')
      .set(auth(a.token))
      .send({ username: 'bob' });
    const convoId = created.body.conversation._id;

    await request(app)
      .post(`/api/conversations/${convoId}/messages`)
      .set(auth(a.token))
      .send({ content: 'to be deleted' });

    const res = await request(app)
      .delete(`/api/conversations/${convoId}`)
      .set(auth(a.token));
    expect(res.status).toBe(200);

    expect(await Conversation.findById(convoId)).toBeNull();
    expect(await Message.countDocuments({ conversation: convoId })).toBe(0);
    expect(await ConversationMember.countDocuments({ conversation: convoId })).toBe(0);
  });

  it('returns 404 for a non-member', async () => {
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
