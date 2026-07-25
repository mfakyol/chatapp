import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

const ipKey = (req: Request): string => ipKeyGenerator(req.ip ?? '');

const userOrIpKey = (req: Request): string => req.session?.userId ?? ipKey(req);

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

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: { message: 'Too many uploads, please slow down' },
});

export const messageLimiter = rateLimit({
  windowMs: 5 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: { message: 'You are sending messages too fast' },
});
