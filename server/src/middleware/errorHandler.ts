import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { AppError } from '../errors/AppError';
import { env } from '../config/env';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ message: 'Not found' });
};

interface MongoDuplicateKeyError {
  code: number;
  keyPattern?: Record<string, unknown>;
}

function isDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

/**
 * Single source of error responses. Maps known error shapes to status codes and
 * hides internal details in production.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }

  if (err instanceof MulterError || (err as Error)?.message === 'Unsupported file type') {
    return res.status(400).json({ message: (err as Error).message });
  }

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'field';
    return res.status(409).json({ message: `This ${field} is already taken` });
  }

  // eslint-disable-next-line no-console
  console.error(err);
  const message = env.isProd ? 'Server error' : (err as Error)?.message || 'Server error';
  res.status(500).json({ message });
};
