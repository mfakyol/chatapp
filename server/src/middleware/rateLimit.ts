import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/** IPv6-safe IP key (express-rate-limit's helper handles normalization). */
const ipKey = (req: Request): string => ipKeyGenerator(req.ip ?? '');

/**
 * Authenticated routes are keyed by the session user, falling back to IP for
 * the unauthenticated edge — users behind one NAT must not share a bucket.
 */
const userOrIpKey = (req: Request): string => req.session?.userId ?? ipKey(req);

/**
 * Brute-force guard for auth endpoints. Keyed per IP **and** attempted account
 * (an attacker rotating accounts from one IP is still capped per account, and
 * a shared-IP office can't lock each other out of different accounts). Counts
 * only failed attempts so valid users aren't punished.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const body = req.body as Record<string, unknown> | undefined;
    const account =
      typeof body?.identifier === 'string'
        ? body.identifier
        : typeof body?.email === 'string'
          ? body.email
          : '';
    return `${ipKey(req)}:${account.toLowerCase()}`;
  },
  message: { message: 'Too many attempts, please try again later' },
});

/** Throttle for the CPU/IO-heavy attachment upload endpoint (per user). */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: { message: 'Too many uploads, please slow down' },
});

/** Anti-spam throttle for message sending (per user, all sends are REST). */
export const messageLimiter = rateLimit({
  windowMs: 5 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: { message: 'You are sending messages too fast' },
});
