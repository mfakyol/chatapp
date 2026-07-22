# Node.js / Express — Security Standards

Reusable security checklist for Node + Express + TypeScript APIs. Apply these by
default on every backend; treat exceptions as decisions that need justification.

> **This repo:** auth is **stateless JWT (Bearer token)**, not server sessions — the
> "sessions" guidance below maps to token handling. Socket.io shares the same JWT.
> See [`PROJECT-chatapp.md`](PROJECT-chatapp.md) for what's already done vs. open.

## Input & validation
- Validate **every** external input at the boundary (`body`, `params`, `query`,
  headers) with a schema library (e.g. Zod). Reject on failure with a 400.
  **This includes Socket.io event payloads** (`message:send`, friend events, etc.).
- Derive types from the schema (`z.infer`) so validation and types share one
  source of truth.
- **Never spread raw `req.body` into a DB model** (mass-assignment). Persist only
  whitelisted, validated fields.
- Validate resource IDs (e.g. `ObjectId.isValid`) before hitting the database
  (`conversationId`, `messageId`, user lookups).
- Cap sizes: body parser limit (`express.json({ limit: '1mb' })`), max message
  length, max group participant count, pagination `limit` caps on message history.

## Authentication & tokens (JWT)
- Hash passwords with bcrypt/argon2 (bcrypt cost ≥ 10). Never store or log plaintext.
- Enforce a strong `JWT_SECRET`; **require it in production (fail fast if missing)** —
  never fall back to a hardcoded/default secret.
- Keep token lifetime bounded (`JWT_EXPIRES_IN`); sign the minimum claims (`sub`).
- Verify the token the **same way** in the HTTP guard and the Socket.io handshake —
  share one verify helper so they can't drift.
- Return generic auth errors ("invalid credentials") — don't reveal which field failed.
- Client stores the token: if in `localStorage` it's readable by any XSS, so XSS
  hygiene on the client is part of the auth story (see `frontend-structure.md`).

## Authorization
- Check ownership/role on every state-changing or private-read route, not just at the router level.
- Default deny: private resources return 403/404 unless the caller is a participant/owner.
- Chat-specific: verify the caller is a **participant** of the conversation before
  reading/sending/editing; only the **sender** may edit/delete their message; only a
  group **admin** may rename/add/remove members. Enforce in the service, for both the
  REST and socket paths.

## Rate limiting & abuse
- Rate-limit auth endpoints (login/register) against brute force, keyed per
  **IP + account**, counting **failed** attempts only so valid users aren't punished.
- Rate-limit message send / friend-request spam and file uploads separately.
- Note: an in-memory limiter is **per-process** — use a shared store (Redis) once
  you run more than one instance (also required to scale Socket.io horizontally).

## File uploads (Multer)
- Whitelist MIME types **and** cap size (already `10MB` here); reject everything else.
- Generate random server-side filenames; never trust `originalname` for the stored path.
- Store outside the app code dir and serve read-only; set correct `Content-Type` and
  consider `Content-Disposition: attachment` for non-image types to avoid inline execution.
- Validate the uploaded file belongs to a conversation the caller participates in.

## Transport & headers
- Use `helmet` for security headers. Enable HSTS in production.
- Lock CORS to the known client origin(s) with `credentials: true`; don't use `*`.
  Apply the **same origin allowlist** to the Socket.io CORS config.
- Serve over HTTPS in production; set `trust proxy` correctly when behind the proxy
  (this repo runs behind an nginx `proxy/`) — and only then, so clients can't spoof `X-Forwarded-For`.

## Errors, logging & data hygiene
- One central error handler. **Never leak stack traces or internal messages** to
  clients in production; return a generic 500. Map known errors (e.g. Mongo dup key → 409).
- Don't put secrets, tokens, passwords, or PII in URLs, query strings, or logs.
- Prefer structured logging (pino) with request IDs over `console.*` in production.

## Data integrity
- Add unique indexes for natural keys (`username`, `email`); handle the duplicate-key error path.
- Clean up dependent documents on delete (cascade): deleting a `Conversation` should
  remove its `Message`s; removing a friend should clear reciprocal references.
- Use atomic operations (`findOneAndUpdate`, `$addToSet`, upserts) where races matter
  (read receipts, friend requests), backed by unique indexes.

## Config, secrets & lifecycle
- Centralize config in one typed module; validate required vars, fail fast in prod.
- Keep `.env` out of version control; commit a `.env.example` with safe placeholders.
- Expose a health/readiness endpoint that reflects **dependency status** (DB
  connectivity), returning non-200 when unhealthy. (Currently `/health` is static.)
- Handle graceful shutdown (`SIGTERM`/`SIGINT`): stop accepting connections, close the
  Socket.io server, drain in-flight requests, close the Mongo connection, force-exit fallback.

## Quick pre-ship checklist
- [ ] All inputs (HTTP + socket) schema-validated; no raw-body persistence
- [ ] Passwords hashed; `JWT_SECRET` required in prod; one shared token verifier
- [ ] Auth rate-limited; message/upload endpoints rate-limited
- [ ] Uploads MIME+size capped, random names, participant-checked
- [ ] helmet + locked CORS (HTTP + socket) + body limits
- [ ] Central error handler hides internals in prod
- [ ] Secrets required in prod, not committed
- [ ] Health check reflects DB; graceful shutdown closes io + Mongo
