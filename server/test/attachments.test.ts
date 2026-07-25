import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import type { Express } from 'express';
import { buildTestApp, makeFriends, registerUser } from './helpers';
import { UPLOADS_DIR } from '../src/utils/attachments';

// Minimal valid 1x1 PNG
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

let app: Express;
beforeEach(async () => {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  app = buildTestApp();
});

async function directConvo(a: Awaited<ReturnType<typeof makeFriends>>['a']) {
  const res = await a.agent.post('/api/conversations/direct').send({ username: 'bob' });
  return res.body.conversation._id as string;
}

describe('attachment uploads', () => {
  it('stores a safe /api/attachments URL and rejects spoofed content', async () => {
    const { a } = await makeFriends(app);
    const convoId = await directConvo(a);

    const ok = await a.agent
      .post(`/api/conversations/${convoId}/attachments`)
      .attach('file', PNG_BYTES, { filename: 'photo.png', contentType: 'image/png' });

    expect(ok.status).toBe(201);
    expect(ok.body.message.attachment.url).toMatch(/^\/api\/attachments\/.+\.png$/);

    const bad = await a.agent
      .post(`/api/conversations/${convoId}/attachments`)
      .attach('file', PNG_BYTES, { filename: 'plain.txt', contentType: 'text/plain' });

    expect(bad.status).toBe(400);
  });

  it('rejects dangerous original extensions such as .html', async () => {
    const { a } = await makeFriends(app);
    const convoId = await directConvo(a);

    const res = await a.agent
      .post(`/api/conversations/${convoId}/attachments`)
      .attach('file', Buffer.from('hello'), { filename: 'evil.html', contentType: 'text/plain' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/attachments/:filename', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/attachments/123.png');
    expect(res.status).toBe(401);
  });

  it('allows conversation members and blocks outsiders', async () => {
    const { a, b } = await makeFriends(app);
    const convoId = await directConvo(a);

    const upload = await a.agent
      .post(`/api/conversations/${convoId}/attachments`)
      .attach('file', PNG_BYTES, { filename: 'photo.png', contentType: 'image/png' });
    expect(upload.status).toBe(201);

    const filename = path.basename(upload.body.message.attachment.url);
    const memberRes = await b.agent.get(`/api/attachments/${filename}`);
    expect(memberRes.status).toBe(200);
    expect(memberRes.headers['content-type']).toMatch(/^image\/png/);
    expect(memberRes.headers['x-content-type-options']).toBe('nosniff');

    const outsider = await registerUser(app, { username: 'carol', email: 'carol@test.co' });
    const denied = await outsider.agent.get(`/api/attachments/${filename}`);
    expect(denied.status).toBe(404);
  });

  it('does not expose a public uploads route', async () => {
    const res = await request(app).get('/uploads/not-real.png');
    expect(res.status).toBe(404);
  });
});

describe('attachment file cleanup', () => {
  async function uploadPng(agent: Awaited<ReturnType<typeof makeFriends>>['a']['agent'], convoId: string) {
    const res = await agent
      .post(`/api/conversations/${convoId}/attachments`)
      .attach('file', PNG_BYTES, { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    const filename = path.basename(res.body.message.attachment.url);
    return { messageId: res.body.message._id as string, filePath: path.join(UPLOADS_DIR, filename) };
  }

  it('deleting a message removes its file from disk', async () => {
    const { a } = await makeFriends(app);
    const convoId = await directConvo(a);
    const { messageId, filePath } = await uploadPng(a.agent, convoId);

    await expect(fs.access(filePath)).resolves.toBeUndefined();

    const del = await a.agent.delete(`/api/conversations/${convoId}/messages/${messageId}`);
    expect(del.status).toBe(200);

    await expect(fs.access(filePath)).rejects.toThrow();
  });

  it('deleting a conversation removes all its files from disk', async () => {
    const { a } = await makeFriends(app);
    const convoId = await directConvo(a);
    const first = await uploadPng(a.agent, convoId);
    const second = await uploadPng(a.agent, convoId);

    const del = await a.agent.delete(`/api/conversations/${convoId}`);
    expect(del.status).toBe(200);

    await expect(fs.access(first.filePath)).rejects.toThrow();
    await expect(fs.access(second.filePath)).rejects.toThrow();
  });
});
