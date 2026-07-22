# Frontend — Structure & Component Standards

Reusable structure for **Next.js (App Router) + TypeScript** SPAs/apps. Optimizes for
separation of concerns, discoverability, and a consistent component model.

> **This repo:** `client/` is Next.js App Router (not Vite) and is moving from React
> Context to **zustand stores** as part of the refactor. Treat this doc as the target.
> `AGENTS.md` warns this Next.js version has breaking changes — check
> `node_modules/next/dist/docs/` before using framework APIs. See
> [`PROJECT-chatapp.md`](PROJECT-chatapp.md) for the current state.

## Layout

```
src/
  app/           # App Router: route segments, layouts, pages (thin — compose components)
  components/
    ui/          # brand-neutral design-system primitives (Button, Input, Modal, Avatar)
    <feature>/   # feature-scoped components grouped in one folder (chat/, friends/)
  hooks/         # reusable logic (useX)
  stores/        # client state — one store per domain (zustand)
  services/      # typed API calls — one module per resource (or lib/ as today)
  schemas/       # client-side validation (Zod), shared with server DTOs where possible
  types/         # shared types
  utils/         # pure, framework-free helpers
  lib/           # low-level clients (api fetch wrapper, socket singleton)
  i18n/          # translations / locale
  styles/        # global styles
```

## Layering & responsibilities

- **app/** route segments compose layouts + components and own route-level wiring.
  Keep page components thin; push logic into hooks/stores/services.
- **components/ui** are presentational, app-agnostic primitives you could reuse in
  any project. **components/<feature>** are app-specific and may read stores.
- **stores** hold state, **one store per domain** (`auth`, `presence`, `conversations`,
  `messages`). Avoid a single god store. Select narrow slices to limit re-renders.
  Socket-driven updates dispatch into the relevant store; components subscribe to slices.
- **services** own all HTTP IO. Wrap the client to return a **discriminated result**
  (`{ success: true, data } | { success: false, error }`) instead of throwing, so
  callers handle errors explicitly and type-safely. (`lib/api.ts` currently throws —
  target is the result type.)
- **lib/socket.ts** owns the single Socket.io connection; stores/hooks consume it, and
  components never create their own socket.
- **hooks** extract reusable stateful logic; **utils** stay pure (no React, easily unit-tested).

## Component-model rules

- Keep a feature's components in **one place**. Don't split the same feature across
  top-level `components/` and a `components/<feature>/` subfolder — pick one.
- Prefer small, focused components; colocate a component's private helpers, extract
  shared ones to `utils/`.
- Co-locate `state` with usage; lift to a store only when shared across routes.
- Guard route access with an App Router layout (a protected segment / server-side check
  or an auth-gate layout) rather than repeating the check per page.

## Naming conventions

- Components `PascalCase.tsx`; hooks `useCamelCase.ts`; stores `x.store.ts`;
  services `x.service.ts`; utils `camelCase.ts`.

## Imports

- Use the `@/` path alias for **all** intra-`src` imports — including same-directory
  siblings. Avoid relative `./` and `../` so imports don't break when files move and
  stay grep-able. (Already configured in `tsconfig.json`.)
  - ✅ `import Avatar from '@/components/ui/Avatar'`
  - ❌ `import Avatar from './Avatar'`

## Frontend security defaults

- **Never** `dangerouslySetInnerHTML` with user/remote data (message content, usernames).
  Rely on React escaping.
- **Auth token** lives in `localStorage` today — that makes strict XSS hygiene part of
  the auth story; any injected script can read it. Sanitize/escape all user-rendered
  content and avoid `eval`/dynamic HTML.
- **Socket.io**: only act on events from the app's own connection; validate/normalize
  payload shape before writing to a store — treat server pushes as untrusted input.
- Validate/normalize redirect targets (must start with `/`, not `//`) to prevent open redirects.
- External links / uploaded-file links: `target="_blank"` → add `rel="noreferrer"` (or `noopener`).
- Show raw error details only in development (`process.env.NODE_ENV !== 'production'`);
  keep production messages generic.
- Keep user-facing strings in i18n. **This app's UI is Turkish and currently hardcoded**
  in components — extracting to `i18n/` is a tracked follow-up, not a blocker.
