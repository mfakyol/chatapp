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
**Principle: sockets are a downstream (server→client) delivery channel only.** All
mutations go through REST and share the same validate/auth/rate-limit chain. The only
client→server socket events are `typing:start|stop` (ephemeral, never persisted).

- On connect a socket joins exactly **one room**: `user:<id>`. There is NO
  per-conversation room membership — that would be derived state needing hand-sync
  with the DB on every membership change, and any missed sync silently drops events.
- All fan-out goes through `services/fanout.ts` (`broadcastToConversation`): recipient
  user-ids are resolved from `ConversationMember` **at send time**. DB is the single
  source of truth for delivery.
- Presence: in-memory ref-counted `utils/presence.ts` (multi-tab correct); only
  `lastSeen` is persisted (on last-disconnect). `presence:update` goes to friends only.
  REST payloads merge live `isOnline` via `withPresence`.
- Server→client events: `message:new|updated|deleted|reaction`,
  `conversation:new|updated|deleted|read`, `friend:request|accepted|declined|removed`,
  `presence:update`, `typing:start|stop`.
- Sending is **optimistic**: client renders a temp bubble under a generated
  `clientTempId`, POSTs it, and reconciles when the echo (response or broadcast)
  carries the same id. Retries are idempotent (partial unique index on
  `{sender, clientTempId}`).
- Reconnect resync: on socket `connect` the client refetches the sidebar (and the open
  conversation's messages load on demand) — no server-side replay needed.
- Client: `client/src/lib/socket.ts` holds a single socket singleton.

## Data / models
- MongoDB (Mongoose). Models: `User`, `Friendship`, `Conversation`,
  `ConversationMember`, `Message`.
  - `User`: identity only — username (unique, `^[a-z0-9_-]{3,20}$`), email (unique),
    bcrypt password (cost 10, `pre('save')`), avatarUrl, lastSeen. NO friendship
    arrays, NO isOnline (presence is runtime state).
  - `Friendship`: `{userA, userB}` **sorted pair** + unique compound index;
    `requestedBy`, `status: pending|accepted`. All transitions are single-document
    atomic ops; reversed/duplicate requests are structurally impossible.
  - `Conversation`: `type: direct|group`, name, createdBy, lastMessage, and for
    direct chats a unique sparse `directKey` (`"idLo:idHi"`) — direct creation is a
    race-proof upsert.
  - `ConversationMember`: one doc per (conversation, user), unique compound index.
    Holds `role: admin|member` and the **`lastReadAt` read pointer** (WhatsApp/Discord
    model): read = one field update; unread = range count; "seen" ⟺
    `member.lastReadAt >= message.createdAt`. Ticks/receipts derive from this.
  - `Message`: conversation, sender, content, attachment, replyTo, reactions,
    `clientTempId` (partial unique with sender), editedAt, deletedAt (soft delete).
    **No readBy** — messages never grow with reads.
- **Cascade**: deleting a `Conversation` deletes its `Message`s AND
  `ConversationMember`s (pre-delete hooks). `DELETE /api/conversations/:id` uses it.
- API assembly: services return conversations with `participants`, `admins`, and
  `members` (with lastReadAt) assembled from ConversationMember + live presence.

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
- **Backend:** Vitest + `supertest` + `mongodb-memory-server` in `server/test/`
  (`npm test`). Integration tests hit the built `app` (with a no-op Socket.io stub set
  via `app.set('io', …)`); socket-shared logic is covered at the service level. Per-test
  collection cleanup; `test/setup.ts` owns the in-memory Mongo lifecycle. 28 tests today.
- **Client:** Vitest + Testing Library (jsdom) in `client/test/` (`npm test`). Covers the
  `t()` i18n helper, the `request()` Result wrapper (mocked fetch), the presence store,
  and the Avatar component. 10 tests today.

## Theming
- Dark (default) + light themes via CSS variables in `client/src/app/globals.css`
  (`:root` / `:root[data-theme="light"]`), using a **Discord-inspired** palette (blurple
  `#5865f2`, dark surfaces `#1e1f22`/`#2b2d31`/`#313338`). Components use semantic
  utilities only (`bg-[var(--bg-surface)]`, `text-[var(--text-normal)]`, `--brand`,
  `--bubble-own`, `--online`, `--danger`, …) — no raw hex.
- `stores/theme.store.ts` toggles + persists to `localStorage`; `components/ThemeToggle`
  is in the sidebar header, home nav, and auth pages. A tiny no-FOUC script in
  `layout.tsx` sets `data-theme` before paint (html has `suppressHydrationWarning`).

## Conventions for this repo/owner
- **Do not add a `Co-Authored-By` trailer** to commits (owner preference).
- Prefer small, single-concern commits.
- UI copy is **English**, centralized in `client/src/i18n/messages.ts` (the README/setup
  docs are Turkish, but the app UI is English). Add new strings there, not inline.

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
8. ✅ **Client**:
   - ✅ Context → **zustand** — `stores/auth.store` + `stores/presence.store`; hooks
     `useAuth`/`usePresence(Map)` keep the old APIs; `AuthBootstrap`/`PresenceListener`
     replace the providers. Runtime-verified (register → redirect → chat).
   - ✅ Components grouped by concern — `components/ui/` (Avatar) + `components/chat/`
     (ChatWindow, Sidebar, ProfilePanel, MessageTicks); app-infra listeners stay at root.
   - ✅ API → **discriminated result** — `lib/api.request<T>()` returns
     `{ success, data } | { success, error }`; `services/{auth,user,conversation}.service`
     wrap it; `lib/resources.ts` removed; every caller handles the Result explicitly.
     Runtime-verified (login error shows message; register + data fetch succeed).
   - ✅ **i18n** — all UI copy extracted to `i18n/messages.ts`; `t(key, params)` accessor
     with `{param}` interpolation; applied across home, auth pages, sidebar, chat window,
     profile panel. (Copy is **English**, not Turkish — the earlier note was wrong. The
     marketing demo mockup on `/` is left inline as illustrative content.)
   - _Pre-existing_: `set-state-in-effect` lint errors in `ChatWindow`/`Sidebar`/
     `ProfilePanel` (unrelated to this work; build still passes).
9. ✅ **Backend tests** — Vitest + supertest + mongodb-memory-server (`server/test/`,
   28 tests: auth, friends, conversations, message-service). Client testing still TBD.
