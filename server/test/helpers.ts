import request from 'supertest';
import type { Server } from 'socket.io';
import type { Express } from 'express';
import createApp from '../src/app';

// A no-op Socket.io double so REST handlers that emit events work under test.
const emitter = { emit: () => {}, socketsJoin: () => {}, socketsLeave: () => {} };
export const ioStub = { to: () => emitter, in: () => emitter } as unknown as Server;

export function buildTestApp(io: Server = ioStub): Express {
  const app = createApp();
  app.set('io', io);
  return app;
}

export interface RecordedIo {
  emits: { rooms: string[]; event: string; payload: unknown }[];
  io: Server;
}

/** An io double that records emits (io.to can take a room or a room array). */
export function recordingIo(): RecordedIo {
  const emits: RecordedIo['emits'] = [];
  const io = {
    to: (rooms: string | string[]) => ({
      emit: (event: string, payload: unknown) =>
        emits.push({ rooms: Array.isArray(rooms) ? rooms : [rooms], event, payload }),
    }),
    in: () => ({ socketsJoin: () => {}, socketsLeave: () => {} }),
  } as unknown as Server;
  return { emits, io };
}

export interface TestUser {
  token: string;
  user: { id: string; username: string; email: string };
}

const DEFAULTS = {
  username: 'alice',
  email: 'alice@test.co',
  password: 'secret6',
  firstName: 'Al',
  lastName: 'Ice',
};

/** Register a user and return the auth token + public user. */
export async function registerUser(
  app: Express,
  overrides: Partial<typeof DEFAULTS> = {}
): Promise<TestUser> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...DEFAULTS, ...overrides });
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Register two users and make them friends (a sends, b accepts). */
export async function makeFriends(app: Express) {
  const a = await registerUser(app, { username: 'alice', email: 'alice@test.co' });
  const b = await registerUser(app, { username: 'bob', email: 'bob@test.co' });

  await request(app).post('/api/users/friend-requests/bob').set(auth(a.token));
  await request(app).post('/api/users/friend-requests/alice/accept').set(auth(b.token));

  return { a, b };
}
