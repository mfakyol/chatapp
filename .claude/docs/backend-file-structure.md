# Backend — File Structure Standards

Reusable layered structure for Node + Express + TypeScript services. Optimizes for
clear dependency direction, testability, and predictable file locations.

> **This repo:** `server/` is currently JavaScript/CommonJS and is being migrated to
> TypeScript as part of the refactor. Treat this doc as the **target** structure. See
> [`PROJECT-chatapp.md`](PROJECT-chatapp.md) for the current state and gap list.

## Layout

```
src/
  config/        # env, db, passport/auth setup — startup & infrastructure
  routes/        # endpoint → handler wiring ONLY (no logic)
  middleware/    # validate, requireAuth, rateLimit, errorHandler, upload
  controllers/   # HTTP in/out; parse request, call service, shape response — thin
  services/      # business logic, framework-agnostic (no req/res)
  models/        # data-layer schemas (Mongoose)
  schemas/       # input validation (Zod) — request DTOs
  errors/        # AppError and typed error helpers
  types/         # shared types + third-party .d.ts shims
  sockets/       # Socket.io gateway (domain module: auth + event handlers)
  index.ts         # composition root: connect deps, start server + io, wire shutdown
  app.ts           # build the Express app (middleware + routes), export it
test/            # tests mirroring src/, integration tests on an in-memory DB
```

## Principles

- **Dependency direction is one-way:** `routes → middleware → controllers →
  services → models`. Lower layers never import higher ones.
- **Routes only wire.** A route file maps method+path to middleware+handler and nothing else.
- **Controllers stay thin.** They translate HTTP ⇄ domain and delegate to services.
  Once a handler grows past trivial DB calls, push logic into a `service`.
- **Services are framework-agnostic.** No `req`/`res` — pure functions/classes that
  are unit-testable and reusable. **Sockets and controllers share the same services**
  (e.g. a `messages` service used by both `POST /attachments` and `message:send`),
  so business rules live in one place.
- **One validation source.** Define request schemas once (Zod) and reuse for types
  (`z.infer`). Validate via a single `validate(schema)` middleware. Validate socket
  event payloads with the same schemas.
- **One error model.** A single `AppError` (status, code, message) plus one central
  error handler; controllers `throw`/`next(err)` and never format error responses themselves.
- **Config isolated & typed.** All env access in `config/env`, validated once,
  fail-fast in production (missing `JWT_SECRET`/`MONGO_URI` must crash on boot).
- **Separate `app` from `server`.** `app.ts` builds the app (import it in tests);
  `index.ts` connects dependencies, creates the `http.Server` + Socket.io, and listens.
  This keeps tests fast and DB-agnostic.

## Naming conventions

- `feature.routes.ts`, `feature.controller.ts`, `feature.service.ts`, `feature.schema.ts`
- Models `PascalCase.ts` (`User.ts`, `Conversation.ts`, `Message.ts`)
- Middleware `camelCase.ts` (`requireAuth.ts`, `rateLimit.ts`, `upload.ts`)
- Socket handlers grouped under `sockets/` (`sockets/index.ts` + per-domain handler files)
- Keep one feature's files consistently named across layers so they're easy to find.

## Testing layout

- `test/` mirrors `src/`; name files `feature.test.ts`.
- Prefer integration tests that exercise routes end-to-end against an in-memory DB
  (e.g. `mongodb-memory-server`) + `supertest`, with per-test collection cleanup.
- Import the built `app` (not the live server) so no real network/DB is needed.
- Socket flows: test the underlying **services** directly, plus a thin integration test
  with `socket.io-client` against an ephemeral server when event wiring matters.
