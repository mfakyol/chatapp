import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors/AppError';

export interface RequestParts {
  body?: unknown;
  params?: unknown;
  query?: unknown;
}

/**
 * Validate `body`/`params`/`query` against a Zod schema. On success the parsed
 * `body` and `query` (trimmed/normalized) replace the originals; `params` are
 * validated but left untouched (services normalize casing themselves). On
 * failure a 400 {@link AppError} is forwarded to the central error handler.
 */
export const validate =
  <T extends RequestParts>(schema: ZodType<T>): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue.path.slice(1).join('.');
      return next(new AppError(400, field ? `${field}: ${issue.message}` : issue.message));
    }

    const data = result.data;
    if (data.body !== undefined) req.body = data.body;
    if (data.query !== undefined) req.query = data.query as typeof req.query;
    next();
  };
