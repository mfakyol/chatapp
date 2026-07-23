import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

/**
 * Reads an env var. In production a missing required var is fatal (fail fast);
 * in dev we fall back to a sensible default so `npm run dev` works out of the box.
 */
function required(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (isProd) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd,
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required('MONGO_URI', 'mongodb://localhost:27017/chat-app'),
  sessionSecret: required('SESSION_SECRET', 'dev-only-insecure-secret-change-me'),
  /** Session lifetime in ms (default 7 days). */
  sessionTtlMs: Number(process.env.SESSION_TTL_MS ?? 7 * 24 * 60 * 60 * 1000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
} as const;

export type Env = typeof env;
