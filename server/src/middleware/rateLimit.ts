import rateLimit from 'express-rate-limit';

/**
 * Brute-force guard for auth endpoints. Keyed per IP and counts only **failed**
 * attempts (`skipSuccessfulRequests`) so active users aren't locked out.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
});

/** Throttle for the CPU/IO-heavy attachment upload endpoint. */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many uploads, please slow down' },
});
