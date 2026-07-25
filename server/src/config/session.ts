import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import { env } from './env';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

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
