# Project-Specific — Chat App (WhatsApp-like real-time chat)

Notes unique to **this** repo. General standards live in the sibling docs
(`nodejs-backend-security.md`, `backend-file-structure.md`, `frontend-structure.md`).

## Topology
- Two independent apps, deployed separately, plus an nginx proxy:
  - `client/` — Next.js (App Router) + Tailwind, dev on `:3000`.
  - `server/` — Express API + Socket.io in **TypeScript**, dev on `:4000` (`npm run dev`
    = `tsx watch`; `npm run build` = `tsc` → `dist/`; `npm start` = `node dist/index.js`).
    Serves `/api/*`, `/health`, and static `/uploads/*`. It does **not** serve the app HTML.
  - `proxy/` — nginx reverse proxy; `deploy/` + `docker-compose.prod.yml` for prod.
- MongoDB via `mongo:7` (docker). Auth is **stateless JWT Bearer**, no server sessions.
- **Implication:** `trust proxy` must be set correctly on the server (runs behind nginx)
  before relying on client IPs for rate limiting.

## Real-time architecture (the core of the app)
- `server/src/sockets/index.ts` is the Socket.io gateway. Handshake auth verifies the
  JWT from `socket.handshake.auth.token` (same secret as HTTP). `socket.user` is set.
- **Listeners are registered synchronously** on `connection` before any `await`, so
  events fired immediately after connect aren't dropped — preserve this when refactoring.
- Events include: `conversation:join`, `message:send` (with ack callback), typing,
  read receipts, presence (online/offline), and friend-request notifications.
- Client: `client/src/lib/socket.ts` holds a **single** socket singleton
  (`connectSocket`/`getSocket`/`disconnectSocket`); presence/auth consume it via context
  today (→ zustand stores after refactor).
- REST and socket paths **overlap** (e.g. attachments go via `POST .../attachments`
  while text goes via `message:send`) — business rules must live in a shared service so
  the two paths can't diverge.

## Data / models
- MongoDB (Mongoose). Models: `User`, `Conversation`, `Message`.
  - `User`: username (unique, `^[a-z0-9_-]{3,20}$`), email (unique), bcrypt password
    (cost 10, hashed in `pre('save')`), friends + friendRequests{Sent,Received},
    isOnline/lastSeen. `toPublicJSON()` strips the hash.
  - `Conversation`: `isGroup`, participants[], admins[], createdBy, lastMessage.
  - `Message`: conversation, sender, content, attachment{url,fileName,mimeType,size},
    readBy[], editedAt, deletedAt (soft delete). Requires content OR attachment.
- **Cascade**: deleting a `Conversation` deletes its `Message`s (model pre-delete hooks).
  Note there is currently no delete-conversation route, so the hook is future-proofing.

## Uploads
- `middleware/upload.ts` (Multer): 10MB cap, MIME allowlist, random filenames, stored in
  `server/uploads/`, served static read-only. Keep the allowlist + size cap on refactor.

## Env / config
- Server env: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT` (4000), `CLIENT_URL`,
  `LOG_LEVEL`, `NODE_ENV`.
  Client env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`.
- Env is centralized in typed `config/env.ts`: dev fallbacks so `npm run dev` works
  out of the box, **fail-fast in production** on a missing `MONGO_URI`/`JWT_SECRET`.

## Testing
- **No test suite exists** on either side yet (no `test` script in `server` or `client`).
  Don't claim tests in docs/README. Backend target: Vitest + `supertest` +
  `mongodb-memory-server` in `server/test/`.

## Conventions for this repo/owner
- **Do not add a `Co-Authored-By` trailer** to commits (owner preference).
- Prefer small, single-concern commits.
- UI copy is **Turkish**; keep it consistent (extraction to i18n is a follow-up).

## Refactor direction (decided)
- **Server → TypeScript** with the layered structure in `backend-file-structure.md`.
- **Client → zustand** stores, replacing `context/` (`AuthContext`, `PresenceContext`).

## Backend layout (post #1–#2)
`config/` (env, db, passport) · `errors/` (`AppError` + helpers) · `schemas/` (Zod
request + socket DTOs) · `middleware/` (`requireAuth`, `validate`, `upload`,
`errorHandler`) · `models/` · `services/` (auth/user/conversation/message —
framework-agnostic, **shared by REST + sockets**) · `controllers/` (thin) · `routes/`
(wiring only: `validate(schema)` + handler) · `sockets/` · `utils/` (jwt, rooms, io) ·
`app.ts` + `index.ts`. Controllers `next(err)`; the central `errorHandler` is the only
place that formats error responses and it hides internals in prod. Every HTTP input and
socket payload is Zod-validated at the boundary; `ObjectId` params reject with 400.

## Gap list / open follow-ups (drive the refactor, roughly in order)
1. ✅ **Backend TS migration** — layered structure, `services/`, `errors/` (`AppError`),
   typed `config/env` with fail-fast, central `errorHandler`.
2. ✅ **Validation everywhere** — Zod `schemas/` + `validate()` middleware on all HTTP
   inputs **and** socket payloads; `ObjectId` params rejected with 400; manual format
   guards removed from services (business/ownership checks stay).
3. ✅ **Security hardening** — `helmet` (CORP `cross-origin` so `/uploads` load in the
   client), 1 MB JSON body limit, `authLimiter` (failed-attempt-keyed) on login/register,
   `uploadLimiter` on attachments, `trust proxy` in prod; error handler now surfaces
   http-errors 4xx (413/400) instead of 500. CORS was already locked in #1.
   _Remaining_: socket `message:send` spam throttle (per-connection) — deferred.
4. ✅ **Shared token verifier** — `utils/jwt.verifyToken` used by both the passport-jwt
   strategy and the socket handshake.
5. ✅ **Data integrity** — `Conversation` cascade-deletes its `Message`s (pre
   `deleteOne`/`findOneAndDelete` hooks); read receipts use an idempotent guarded
   `updateMany`; friend-request arrays use `addToSet` to avoid duplicates under races.
6. ✅ **Lifecycle** — `/health` returns 503 `db:down` when Mongo is disconnected;
   `SIGTERM`/`SIGINT` drain connections, `disconnectSockets`, close Mongo, force-exit
   after 10 s. (Signal delivery verified on the Linux/Docker target, not Windows dev.)
7. ✅ **Structured logging** — `config/logger` (pino; pretty in dev, JSON in prod,
   `LOG_LEVEL`-configurable) + `pino-http` per-request logging with request ids; all
   `console.*` removed.
8. **Client**: Context → zustand; `lib/api.ts` throw → discriminated result; group
   components by feature (`components/chat`, `components/friends`); extract hooks; i18n.
9. **Tests**: stand up backend Vitest suite; decide on client testing.
