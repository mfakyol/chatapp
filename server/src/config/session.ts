import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import { env } from './env';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

/**
 * Cookie-session middleware backed by MongoDB. Must be created AFTER mongoose
 * has connected (the store reuses the existing connection's client).
 *
 * The same instance is mounted on both the Express app and the Socket.io
 * engine, so socket handshakes are authenticated by the same httpOnly cookie —
 * no token ever touches JavaScript-readable storage.
 */
export function createSessionMiddleware() {
  return session({
    name: 'sid',
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true, // sliding expiry: activity extends the session
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      ttl: env.sessionTtlMs / 1000,
      // Throttle session writes: with rolling cookies every request would
      // otherwise re-save the session document on each API call.
      touchAfter: 24 * 3600,
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProd,
      maxAge: env.sessionTtlMs,
    },
  });
}

export type SessionMiddleware = ReturnType<typeof createSessionMiddleware>;
