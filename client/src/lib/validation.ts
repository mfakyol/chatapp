// Client-side mirrors of the server's auth validation rules.
// KEEP IN SYNC with server/src/models/User.ts and server/src/schemas/auth.schema.ts —
// the server remains the source of truth; these only give instant feedback.

export const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;

export const MIN_PASSWORD_LENGTH = 6;
