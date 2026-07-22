# Engineering Docs

Reference docs for how this codebase is built. Read the relevant one before making
structural or security decisions.

## Reusable across projects (standards to refactor toward)
- [`nodejs-backend-security.md`](nodejs-backend-security.md) — Node/Express security checklist.
- [`backend-file-structure.md`](backend-file-structure.md) — layered backend structure standards.
- [`frontend-structure.md`](frontend-structure.md) — Next.js client structure & component/security standards.

## Project-specific (do not copy blindly)
- [`PROJECT-chatapp.md`](PROJECT-chatapp.md) — decisions unique to this repo
  (real-time architecture, models, topology, and the refactor gap list / follow-ups).

## Refactor plan
We're refactoring the repo toward these standards, one follow-up at a time — see the
**Gap list** at the bottom of `PROJECT-chatapp.md`. Decided direction: **server → TypeScript**,
**client → zustand**.
