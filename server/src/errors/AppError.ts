/**
 * Application-level error carrying an HTTP status. Controllers/services throw
 * these; the central error handler ({@link module:middleware/errorHandler})
 * translates them into responses. Nothing else formats error responses.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message: string, code?: string) => new AppError(400, message, code);
export const unauthorized = (message = 'Unauthorized', code?: string) =>
  new AppError(401, message, code);
export const forbidden = (message: string, code?: string) => new AppError(403, message, code);
export const notFound = (message: string, code?: string) => new AppError(404, message, code);
export const conflict = (message: string, code?: string) => new AppError(409, message, code);
