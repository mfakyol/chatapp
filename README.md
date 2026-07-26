# Real-Time Chat Application

A production-ready messaging platform with direct and group chats, friend management, and live presence — built as a full-stack TypeScript monorepo.

**Live demo:** [chat.fatihakyol.com](https://chat.fatihakyol.com)

![Chat App screenshot](assets/screenshot.png)

---

## Overview

This project implements a modern chat experience comparable to consumer messaging apps: real-time delivery, read receipts, typing indicators, file sharing, and group administration. The backend owns all mutations over REST; Socket.io is used strictly as a delivery channel. The frontend is a localized Next.js app with optimistic UI and responsive layout.

---

## Features

- **Authentication** — Register/login with httpOnly cookie sessions (no tokens in client storage)
- **Friends** — User search, friend requests, accept/decline/remove with live socket updates
- **Conversations** — 1:1 and group chats; rename, add/remove members, leave or delete
- **Messaging** — Send, edit, delete, reply, emoji reactions; idempotent retries via client temp IDs
- **Read state** — Per-member read pointers and unread counts
- **Presence** — Online/offline status and “typing…” indicators
- **Attachments** — Image and file uploads with MIME validation and membership-gated downloads
- **Search** — In-conversation and global message search
- **UX** — Dark/light theme, EN/TR i18n, reverse infinite scroll, browser notifications, avatar crop & upload

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Zustand, React Hook Form, Zod, Socket.io Client |
| **Backend** | Node.js, Express, TypeScript, MongoDB, Mongoose, Socket.io, Passport (local), express-session, Zod, Multer, Pino |
| **Security** | Helmet, CORS, rate limiting, magic-byte file validation, authenticated attachment serving |
| **Testing** | Vitest, Supertest, Testing Library, mongodb-memory-server |
| **Deployment** | Docker Compose, Next.js standalone, nginx reverse proxy |

---

## Architecture

```
Browser (Next.js)  ──REST──▶  Express API  ──▶  MongoDB
       │                           │
       └── WebSocket (Socket.io) ──┘
              httpOnly session cookie
```

- **REST for mutations** — Messages, reactions, and conversation changes go through validated HTTP endpoints.
- **Sockets for fan-out** — Events are addressed to per-user rooms; membership is resolved from the database at send time.
- **Session-based auth** — A single session middleware is shared by Express and the Socket.io engine.
- **Membership model** — `ConversationMember` is the source of truth for access control and read pointers.

---

## Project Structure

```
chatapp/
├── client/          Next.js frontend
├── server/          Express + Socket.io API
├── proxy/           nginx routing config
└── docker-compose.prod.yml
```

---

## Local Development

**Prerequisites:** Node.js 20+, MongoDB

```bash
# MongoDB
docker run -d --name chat-app-mongo -p 27017:27017 mongo:7

# Server (http://localhost:4000)
cd server
cp .env.example .env
npm install && npm run dev

# Client (http://localhost:3000)
cd client
npm install && npm run dev
```

Client environment (`client/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

**Scripts**

| Command | Location | Description |
|---------|----------|-------------|
| `npm run dev` | `server/` / `client/` | Development server |
| `npm test` | `server/` / `client/` | Run test suite |
| `npm run build` | `server/` / `client/` | Production build |

---

## Author

**Fatih Akyol** — [fatihakyol.com](https://fatihakyol.com)
