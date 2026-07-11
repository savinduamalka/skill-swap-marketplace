<div align="center">

# SkillSwap Marketplace

**Peer-to-Peer Skill Exchange Platform for Community-Driven Learning**

A full-stack web application where people teach what they know and learn what they want — powered by a credit-based economy, real-time chat, live video/audio sessions, and an AI learning-roadmap assistant.

🔗 **Live app:** [skillswap.savinduamalka.app](https://skillswap.savinduamalka.app)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Project Architecture](#project-architecture)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Next.js Application](#1-nextjs-application-skill-swap)
  - [Node.js WebSocket Microservice](#2-nodejs-websocket-microservice-socket-server)
- [Scripts](#scripts)
- [API Documentation](#api-documentation)
- [WebSocket Events](#websocket-events)
- [Database](#database)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Development Guide](#development-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

**SkillSwap Marketplace** is a community marketplace for exchanging skills. Members list skills they can teach and skills they want to learn, then connect with each other to run learning sessions. Instead of money, the platform runs on an internal **credit economy** (every new user gets 100 credits): credits are held when sending connection/session requests and settled when sessions complete or are cancelled.

### Purpose of the System

- Let users **discover** peers by skill and **connect** with them.
- Enable **real-time messaging** (text + media attachments) between connected users.
- Support **live video/audio sessions** for actual teaching, via LiveKit.
- Manage a **credit-based** request/session lifecycle with a wallet and transaction ledger.
- Provide a **social newsfeed** (posts, likes, comments, saves) for community engagement.
- Offer an **AI-generated personalized learning roadmap** for any skill a user wants to learn.
- Track **reputation** through session reviews and multi-dimensional ratings.

The project is composed of **two deployable units** that share a single PostgreSQL database:

| Unit | Folder | Role | Hosting |
|------|--------|------|---------|
| **Next.js Application** | `skill-swap/` | Web UI, REST API routes, authentication, business logic, AI roadmap, LiveKit token issuance | **Vercel** |
| **WebSocket Microservice** | `socket-server/` | Real-time messaging, presence/heartbeat tracking, call signaling, notification fan-out | **Render** |

> 🔗 Production deployment: **[skillswap.savinduamalka.app](https://skillswap.savinduamalka.app)** (Next.js on Vercel), with the WebSocket microservice running on Render.

---

## Project Architecture

### High-Level Architecture

```mermaid
graph TD
    Browser["Browser / Client<br/>(React 19 + Next.js)"]

    subgraph NextApp["Next.js Application (skill-swap)"]
        Pages["App Router Pages<br/>(RSC + Client Components)"]
        REST["REST API Routes<br/>(/app/api/**)"]
        MW["Edge Middleware<br/>(NextAuth route guard)"]
    end

    subgraph Socket["Node.js WebSocket Microservice (socket-server)"]
        IO["Socket.IO Server"]
        Internal["Internal HTTP API<br/>POST /internal/notifications"]
    end

    DB[("PostgreSQL<br/>(Supabase) via Prisma")]
    Redis[("Redis<br/>(Socket.IO adapter + presence)")]
    Storage[("Supabase Storage<br/>media bucket")]
    LiveKit["LiveKit Cloud / SFU<br/>(video + audio)"]
    LLM["xAI Grok<br/>(OpenAI-compatible API)"]
    Email["Resend<br/>(transactional email)"]

    Browser -->|HTTPS| Pages
    Browser -->|fetch JSON| REST
    Browser <-->|WebSocket| IO
    Browser <-->|WebRTC media| LiveKit

    Pages --> MW
    REST -->|Prisma Client| DB
    REST -->|"server-to-server (x-socket-secret)"| Internal
    REST -->|signed JWT token| LiveKit
    REST -->|upload/delete| Storage
    REST -->|chat completion| LLM
    REST -->|send reset email| Email

    IO -->|Prisma Client| DB
    IO <-->|pub/sub + presence| Redis
    Internal --> IO
```

### How the Next.js App and the WebSocket Microservice Interact

The two services are **decoupled** and communicate through three channels:

1. **Shared PostgreSQL database** — Both services use Prisma against the same `DATABASE_URL`. The Next.js app owns the schema and migrations; the socket server reads/writes the same tables (`messages`, `connections`, `notifications`, `users`, `user_online_status`).
2. **Shared JWT secret (`SOCKET_SECRET`)** — The browser requests a short-lived (1 minute) JWT from the Next.js endpoint `GET /api/auth/socket`. It then opens a Socket.IO connection using that token in `auth.token`. The socket server verifies the token with the same `SOCKET_SECRET`, establishing the user's identity (`userId`) on the socket.
3. **Internal server-to-server HTTP** — When a REST route needs to push a real-time notification (e.g. a new connection request), `lib/notifications.ts` calls `POST {NEXT_PUBLIC_SOCKET_URL}/internal/notifications` with the `x-socket-secret` header. The socket server validates the secret and emits `notification:new` to the target user's room.

```mermaid
sequenceDiagram
    participant U as Browser
    participant N as Next.js (REST)
    participant S as Socket.IO Server
    participant D as PostgreSQL
    participant R as Redis

    U->>N: GET /api/auth/socket (session cookie)
    N-->>U: { token } (JWT, exp 1m, signed with SOCKET_SECRET)
    U->>S: connect(auth.token)
    S->>S: jwt.verify(token, SOCKET_SECRET) -> userId
    S->>R: SADD online_users userId
    S->>D: UPDATE users SET isOnline = true
    S-->>U: connected (join room: userId)

    U->>S: send_message { connectionId, content, tempId }
    S->>D: validate connection + INSERT message
    S-->>U: message_sent { tempId, savedMessage }
    S->>S: io.to(receiverId).emit('receive_message')
    S->>D: INSERT notification (if receiver not in active convo)

    Note over N,S: Separately, REST routes push notifications:
    N->>S: POST /internal/notifications (x-socket-secret)
    S->>U: notification:new
```

### Folder Structure

```
Skill-Swap/Code/
├── README.md                      # ← this file (covers both services)
├── skill-swap/                    # Next.js application
│   ├── app/
│   │   ├── api/                   # REST API route handlers (App Router)
│   │   │   ├── auth/              # register, login (NextAuth), reset/forgot password, socket token
│   │   │   ├── connections/       # connection request lifecycle
│   │   │   ├── dashboard/         # dashboard aggregation
│   │   │   ├── internal/email/    # (empty / placeholder)
│   │   │   ├── livekit/           # token issuance + webhook receiver
│   │   │   ├── messages/          # conversation history, upload, offers, delete
│   │   │   ├── newsfeed/          # posts, comments, likes, saves
│   │   │   ├── notifications/     # list, read, seen, unread-count
│   │   │   ├── reviews/           # review replies
│   │   │   ├── roadmap/           # AI roadmap generate / CRUD
│   │   │   ├── sessions/          # session + session-request lifecycle
│   │   │   ├── skillfeed/         # (empty directories — see concerns)
│   │   │   ├── user/              # profile, skills, wallet, transactions, settings
│   │   │   └── users/             # public user profiles, posts, skills, block
│   │   ├── (page routes)/         # dashboard, messages, newsfeed, profile, roadmap, etc.
│   │   ├── layout.tsx             # root layout + context providers
│   │   ├── error.tsx / not-found.tsx
│   │   └── globals.css
│   ├── components/                # UI components (incl. shadcn/ui in components/ui)
│   ├── contexts/                  # React context providers (wallet, call, notifications, unread)
│   ├── hooks/                     # useChatSocket, useLiveKit, use-toast, use-mobile
│   ├── lib/                       # auth, prisma, supabase, llm, roadmap, notifications, utils, types
│   ├── prisma/
│   │   ├── schema.prisma          # single source of truth for the data model
│   │   └── migrations/            # SQL migrations
│   ├── middleware.ts              # NextAuth-based route protection
│   ├── prisma.config.ts
│   ├── next.config.mjs
│   ├── tsconfig.json
│   ├── .env.example
│   └── package.json
└── socket-server/                 # Node.js WebSocket microservice
    ├── server.ts                  # entire Socket.IO + Express server
    ├── prisma/schema.prisma       # copy of the shared schema
    ├── prisma.config.ts
    ├── dist/                      # compiled output
    ├── tsconfig.json
    ├── README.md                  # service-specific notes
    └── package.json
```

### Service Communication Flow (summary)

- **Client ⇄ Next.js**: HTTPS for pages and `fetch` for JSON REST APIs. Session via NextAuth JWT cookie.
- **Client ⇄ Socket Server**: Persistent WebSocket (with polling fallback) authenticated by short-lived JWT.
- **Client ⇄ LiveKit**: Direct WebRTC media using a token minted by `POST /api/livekit/token`. Call *signaling* (ring/answer/reject/end) is relayed through the socket server; actual audio/video flows through LiveKit's SFU.
- **Next.js ⇄ Socket Server**: One-way internal HTTP (`/internal/notifications`, `/internal/newsfeed`) secured by `SOCKET_SECRET`.
- **Newsfeed Pub/Sub**: API routes publish interaction events → socket server broadcasts via `io.emit()` → all connected clients receive updates in real-time (likes, comments, replies sync across all viewers without page reload).
- **Both services ⇄ PostgreSQL**: Prisma Client over a `pg` connection pool.
- **Socket Server ⇄ Redis**: Socket.IO Redis adapter (cross-node broadcast) + presence sets, active-conversation keys, and per-user message rate limiting.

---

## Technologies Used

### Frontend
- **Next.js 16** (App Router, React Server Components) — `next@16.0.10`
- **React 19** + **React DOM 19**
- **TypeScript 5**
- **Tailwind CSS 4** (`@tailwindcss/postcss`, `tailwindcss-animate`, `tw-animate-css`)
- **shadcn/ui** pattern built on **Radix UI** primitives (`components.json`, `components/ui/*`)
- **lucide-react** (icons), **sonner** (toasts), **vaul** (drawer), **cmdk** (command menu)
- **recharts** (charts/analytics), **embla-carousel-react**, **react-resizable-panels**
- **react-hook-form** + **@hookform/resolvers** + **zod** (forms & validation)
- **date-fns**, **next-themes** (dark mode), **input-otp**, **react-day-picker**
- **@emoji-mart/react** + **@emoji-mart/data** (emoji picker)

### Backend (Next.js API layer)
- **Next.js Route Handlers** (`app/api/**/route.ts`)
- **NextAuth v5 (beta)** — `next-auth@5.0.0-beta.30` with `@auth/prisma-adapter`
- **Prisma 7** (`@prisma/client`, `@prisma/adapter-pg`) over **node-postgres (`pg`)**
- **bcryptjs** (password hashing), **jsonwebtoken** (socket token), **uuid**
- **Resend** (`resend@6.16.0`) for transactional emails (password reset, connection request, message notifications) with branded HTML templates

### WebSocket / Real-time
- **Socket.IO 4** server (`socket.io`) and **socket.io-client** on the web app
- **Express 5** (hosts Socket.IO + the internal notifications endpoint)
- **@socket.io/redis-adapter** + **ioredis** (horizontal scaling & presence)
- **cors**, **dotenv**

### Real-time Media (Calls)
- **LiveKit** — `@livekit/components-react`, `@livekit/components-styles`, `livekit-client`, `livekit-server-sdk` (token minting + webhook signature verification)

### AI / LLM
- **xAI Grok** via an OpenAI-compatible chat-completions endpoint (`https://api.x.ai/v1/chat/completions`), used to generate structured learning roadmaps (`lib/llm.ts`, `lib/roadmap.ts`)

### Database
- **PostgreSQL** (provider in `migration_lock.toml` = `postgresql`), hosted on **Supabase**
- **Supabase Storage** for media uploads (chat attachments, newsfeed media) — bucket `newsfeed-media`
- Prisma migrations under `skill-swap/prisma/migrations`

> Note: `socket-server/node_modules` also contains `mysql2` and `postgres` (transitive/optional Prisma driver dependencies). The application is configured for **PostgreSQL** only.

### Infrastructure / DevOps
- **pnpm** (lockfiles present in both packages)
- **nodemon** + **tsx** / **ts-node** for the socket server dev/runtime
- **ESLint** (`next/core-web-vitals`, `next/typescript`, import ordering rules)
- **Vitest** unit test suite (89 tests across 7 files — auth, connections, messages, sessions, notifications, upload security)
- **Hosting**: the **Next.js app is deployed on Vercel** ([skillswap.savinduamalka.app](https://skillswap.savinduamalka.app)); the **WebSocket microservice is deployed on Render** (the commented production socket URL in `.env.example` points to `*.onrender.com`).
- **CI/CD**: Vercel auto-deploys on push to `main`; Render auto-deploys on push. No Docker required — both platforms provide native build environments.
- **Schema sync**: `./sync-schema.sh` copies the Prisma schema from `skill-swap/` to `socket-server/` and regenerates the client.

---

## Features

### Authentication & Authorization
- Email/password registration with bcrypt hashing and email-format/length validation.
- **OAuth** sign-in via **Google** and **Facebook** (NextAuth providers, with dangerous email account linking enabled).
- JWT session strategy (30-day max age) for Edge-middleware compatibility.
- Route protection through `middleware.ts` — public routes are `/`, `/login`, `/signup`, `/reset-password`; everything else requires authentication; logged-in users hitting `/login` or `/signup` are redirected to `/dashboard`.
- Password reset flow via **Resend** with branded HTML email templates: `forgot-password` (token generation + rate limiting) → email delivery → `reset-password` page.
- **Social login detection**: if a user who signed up via Google/Facebook tries to reset their password, the system detects the missing `passwordHash`, identifies the linked provider, and displays a helpful message directing them to use OAuth instead.
- Change password, delete account.
- New users automatically receive a **wallet with 100 credits** and an `INITIAL_ALLOCATION` transaction. OAuth users are auto-marked verified.

### Skills & Discovery
- Add/edit skills offered (proficiency, years of experience, teaching format, availability window, time zone, alternative search names).
- Add/edit skills wanted (with target proficiency).
- Search users/skills with **search history** persistence.

### Connections (credit-gated)
- Send a connection request → **5 credits held** in the sender's `outgoingBalance` (atomic Prisma transaction + ledger entry).
- Accept / decline / cancel requests; an accepted request creates an `ACTIVE` connection.
- **Disconnect** (close connection) — available from the Active tab and the user's profile page.
- Block / unblock users (blocked users are filtered out of the newsfeed and discovery).
- Connection status checks.
- Notification click navigates to the correct tab (incoming/active/sent).

### Real-time Messaging
- One-to-one chat scoped to an active connection.
- **Cursor-based pagination** (50 messages per page) with infinite scroll — older messages load automatically as the user scrolls up, with scroll position preservation.
- **In-chat search** that loads the full message pool (`?all=true`) for searching across the entire conversation history.
- **Media attachments**: images, video, audio, and documents uploaded to Supabase Storage (per-type size limits up to 100 MB for video).
- Read receipts, message deletion (multi-select), and full conversation clearing — all mirrored to the other user in real time.
- **Offers** embedded in chat (create offer, accept/decline/counter-offer) with real-time status updates.
- Server-side **rate limiting** (5 messages/second/user via Redis).
- Notification suppression when the recipient is actively viewing the conversation.
- **Emoji picker** integration for rich message composition.
- **Conversation sorting** — conversations with newest messages automatically bubble to the top.
- **Persistent call logs** — call events (ended, missed, declined) saved as messages visible after reload.

### Presence (enterprise-grade)
- Online/offline tracking with **30s heartbeat**, **90s offline timeout**, and **1s debounce**.
- Redis-backed global presence set so status is correct across multiple socket-server nodes.
- **Presence subscription** (`get_users_status`): clients can request the current online status of specific users on demand, ensuring accurate status display even if the user connected before the status broadcast.
- `user_online_status` history table for analytics (device info, IP).
- "Last seen X minutes ago" display with periodic refresh.

### Live Sessions (Video & Audio)
- LiveKit-powered prebuilt video calls and a custom audio-call interface.
- Call signaling (`call:initiate` → `call:incoming` / `call:accepted` / `call:rejected` / `call:ended`) relayed via Socket.IO, with offline-recipient detection.
- **Global call receiving** — incoming calls ring on ANY page (not just the messages page) via an authenticated `CallProvider` context with a full-screen incoming call overlay.
- **Ringtone** on incoming calls using the Web Audio API (two-tone ring pattern, stops on answer/reject).
- **Call logs** persisted as messages (saved to database with `mediaType: 'call_event'`) — visible after page reload, styled as centered event indicators.
- Mobile-optimized call controls with safe-area inset handling for notched devices.
- LiveKit token minting and webhook event logging (participant joined/left, room finished).

### Sessions & Reviews (credit settlement)
- Session requests with scheduling (start/end dates), mode (`ONLINE` / `PHYSICAL`), request credits (5) and session credits (20).
- Session lifecycle: active → completion confirmation (both parties) or cancellation (with reason), settling held credits via the transaction ledger.
- Multi-dimensional **reviews** (overall rating + teaching clarity, responsiveness, reliability, punctuality) with optional provider reply.

### Wallet & Credits
- Wallet with `availableBalance`, `outgoingBalance`, `incomingBalance`.
- Full **transaction history** with typed entries (connection/session sent/received/refunded, session completed/cancelled, initial allocation).

### Newsfeed (real-time community feed)
- Create posts (with optional media + hashtags), cursor-paginated feed.
- Like, comment, save/unsave posts; saved-posts view; per-user post listings.
- **Threaded comments** with nested replies
- **Comment reactions** (like/unlike comments) with per-user state tracking.
- **Real-time Pub/Sub architecture** — all newsfeed interactions (likes, comments, replies, new posts) broadcast live to all connected users via Socket.IO:
  - API routes publish events → socket server broadcasts → all clients update instantly.
  - Uses `io.emit()` for global fan-out; Redis adapter ensures delivery across multiple socket nodes.
  - Optimistic UI updates for the acting user (instant feedback) + server-confirmed live updates for all other users.
- In-app notifications for post likes, new comments, and comment replies (with "don't notify self" logic).
- View counts; blocked-user filtering.

### AI Learning Roadmap
- Generate a personalized, scope-aware, phased roadmap for any skill the user wants to learn (xAI Grok, strict JSON output, sanitized server-side).
- Save, list, update progress (per-step completion), and archive roadmaps.

### Notifications & Email Alerts
- Persistent in-app notifications for all meaningful platform interactions:
  - **Connections**: request received, request accepted, request declined (with refund info)
  - **Sessions**: request received, accepted, declined, cancellation requested, cancelled (mutual), completed
  - **Reviews**: new review received
  - **Newsfeed**: post liked, post commented, comment reply, comment liked
- **No message notifications** — new messages do not generate in-app notifications; the unread badge on the messages icon handles this.
- **Email notification system** via Resend with branded HTML templates:
  - Connection request received → email with "View Request" CTA
  - New message received (when receiver is offline) → email with message preview
  - Password reset → email with secure token link
- **Granular notification preferences** (master toggle + per-type: connection requests, session reminders, messages) persisted in the database and auto-saved from the settings UI.
- Smart email delivery: only sends when the receiver is offline (not connected via WebSocket), preventing spam for active users.
- **Global incoming call notifications** — calls ring on any page via the `CallProvider` context (authenticated global socket), not just the messages page.

### UI/UX & Responsive Design
- **Dark mode** support via `next-themes` with system preference detection.
- **Animated landing page** with scroll-reveal animations, floating emojis, animated counters, SVG path draw effects, and feature showcase cards.
- **Fully responsive** across all screen sizes — mobile-first approach with safe-area handling for notched devices.
- Mobile-optimized chat: bottom nav hides when a conversation is open (full-screen chat experience), no auto-focus keyboard, proper viewport height (`100dvh`).
- **shadcn/ui** component library built on Radix UI primitives for accessible, production-grade UI elements.
- Skeleton loading states throughout the application for smooth perceived performance.
- Toast notifications via Sonner for user feedback.

### User Workflow (typical journey)
```mermaid
flowchart LR
    A[Sign up / Log in] --> B[Add skills offered & wanted]
    B --> C[Search & discover peers]
    C --> D[Send connection request<br/>-5 credits held]
    D --> E{Accepted?}
    E -- Yes --> F[Active connection + chat]
    E -- No --> C
    F --> G[Schedule session request]
    G --> H[Live video/audio session]
    H --> I[Confirm completion<br/>credits settle]
    I --> J[Leave review & rating]
    F --> K[Generate AI roadmap]
    F --> L[Post to newsfeed]
```

---

## Setup Instructions

### Prerequisites
- **Node.js 18+** (the socket server README specifies 18+; the Next.js app uses Next 16 which works best on Node 18.18+/20+)
- **pnpm** (lockfiles are pnpm; `corepack enable` recommended)
- A **PostgreSQL** database (Supabase recommended — both services share the same `DATABASE_URL`)
- A **Redis** instance (required by the socket server's adapter & presence; defaults to `redis://localhost:6379`)
- Accounts/keys as needed: **Supabase** (URL + service role key + storage buckets), **Google/Facebook OAuth**, **LiveKit** (Cloud or self-hosted), **xAI** (LLM key), **Resend** (API key + verified domain for email notifications)

> The two services are **separate npm packages**. Install and run them independently.

---

### 1. Next.js Application (`skill-swap`)

#### Dependency installation
```bash
cd skill-swap
pnpm install        # runs `prisma generate` via the postinstall hook
```

#### Environment configuration
```bash
cp .env.example .env
# then fill in the values (see the Environment Variables section)
```

#### Database setup
```bash
# Apply existing migrations to your database
pnpm exec prisma migrate deploy

# (Local development against a fresh DB)
pnpm exec prisma migrate dev

# Regenerate the Prisma client if needed
pnpm exec prisma generate
```

#### Development command
```bash
pnpm dev            # next dev -> http://localhost:3000
```

#### Production build & start
```bash
pnpm build          # prisma generate && next build
pnpm start          # next start
```

#### Other useful commands
```bash
pnpm lint           # eslint .
pnpm type-check     # tsc --noEmit
```

---

### 2. Node.js WebSocket Microservice (`socket-server`)

#### Dependency installation
```bash
cd socket-server
pnpm install
```

#### Generate Prisma Client
```bash
pnpm exec prisma generate
```

#### Environment configuration
There is **no `.env.example` in `socket-server`** (see concerns). Create a `.env` with:
```env
DATABASE_URL=postgresql://user:password@host:port/database   # same DB as the Next.js app
SOCKET_SECRET=your-shared-secret-matching-nextjs             # MUST match the Next.js app
PORT=4000
NEXTJS_URL=http://localhost:3000                             # CORS origin
REDIS_URL=redis://localhost:6379                             # Redis for adapter + presence
```

#### Run commands
```bash
pnpm dev            # nodemon --exec tsx server.ts (hot reload)
pnpm start          # tsx server.ts
# server listens on http://localhost:4000
```

#### Production deployment commands
This service is run directly with **tsx** (no separate compile step is wired into the scripts; a `dist/` build exists but `start` runs `server.ts` via tsx). For production:
```bash
pnpm install --prod=false
pnpm exec prisma generate
# Run under a process manager (PM2 / systemd / container):
pnpm start
# or: pm2 start "tsx server.ts" --name skillswap-socket
```
Set `NEXTJS_URL` to the production web origin and provide a managed Redis URL. The commented entry in the app's `.env.example` (`https://skill-swap-marketplace-p3an.onrender.com`) indicates this service has been deployed on **Render**.

---

## Scripts

### `skill-swap/package.json`

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `prisma generate && next build` | Generate the Prisma client, then build the Next.js app for production. |
| `dev` | `next dev` | Start the Next.js dev server (default `http://localhost:3000`). |
| `lint` | `eslint .` | Lint the codebase using the project ESLint config. |
| `start` | `next start` | Run the production build. |
| `type-check` | `tsc --noEmit` | Type-check without emitting output. |
| `postinstall` | `prisma generate` | Auto-generate the Prisma client after `install`. |

### `socket-server/package.json`

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `nodemon --exec tsx server.ts` | Run the socket server with hot reload. |
| `start` | `tsx server.ts` | Run the socket server (used for production too). |
| `test` | `echo "Error: no test specified" && exit 1` | Placeholder — **no tests implemented**. |

---

## API Documentation

All routes below are under the Next.js app. Most require an authenticated NextAuth session (cookie); unauthenticated calls return `401 Unauthorized`. Dynamic segments are shown in `[brackets]`.

> HTTP methods are inferred from each route handler. Where a route file was not exhaustively read, methods are marked as best-effort.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth handler (OAuth + credentials sign-in, callbacks). |
| `POST` | `/api/auth/register` | Create an account (email, password, fullName). Creates wallet + welcome credits. |
| `POST` | `/api/auth/forgot-password` | Generate a reset token and email a reset link via Brevo. |
| `POST` | `/api/auth/reset-password` | Reset password using a valid token. |
| `POST` | `/api/auth/logout` | Clear session cookies and redirect to `/login`. |
| `GET` | `/api/auth/socket` | Return a short-lived (1m) JWT for connecting to the socket server. |

### Connections
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/connections` | List the current user's connections. |
| `POST` | `/api/connections/request` | Send a connection request (holds 5 credits). |
| `POST` | `/api/connections/accept` | Accept a pending request (creates active connection). |
| `POST` | `/api/connections/decline` | Decline a request. |
| `POST` | `/api/connections/cancel` | Cancel a sent request (refund held credits). |
| `GET` | `/api/connections/status` | Get connection/request status between two users. |
| `POST` | `/api/connections/disconnect` | Close an active connection (sets status to ENDED). |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/messages/conversations` | List the user's conversations. |
| `GET` | `/api/messages/[connectionId]` | Fetch conversation history; marks unread as read. |
| `DELETE` | `/api/messages/[connectionId]` | Clear all messages in a conversation. |
| `POST` | `/api/messages/upload` | Upload chat media to Supabase Storage. |
| `POST` | `/api/messages/delete` | Delete specific messages. |
| `POST` | `/api/messages/offer/accept` | Accept an in-chat offer. |
| `POST` | `/api/messages/offer/decline` | Decline an in-chat offer. |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sessions` | List sessions (filter by `?status=ACTIVE|COMPLETED|CANCELLED`). |
| `POST/GET` | `/api/sessions/requests` | Create / list session requests. |
| `POST` | `/api/sessions/requests/accept` | Accept a session request. |
| `POST` | `/api/sessions/requests/decline` | Decline a session request. |
| `POST` | `/api/sessions/requests/seen` | Mark session requests as seen. |
| `POST` | `/api/sessions/requests/[requestId]/cancel` | Cancel a session request. |
| `POST` | `/api/sessions/[sessionId]/complete` | Confirm session completion (settles credits). |
| `POST` | `/api/sessions/[sessionId]/cancel` | Request/confirm session cancellation. |
| `POST` | `/api/sessions/[sessionId]/review` | Submit a review for a session. |
| `POST` | `/api/reviews/[reviewId]/reply` | Reply to a review. |

### Newsfeed
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/newsfeed` | List (cursor-paginated) / create posts. |
| `GET` | `/api/newsfeed/saved` | List saved posts. |
| `POST` | `/api/newsfeed/[postId]/like` | Like/unlike a post. |
| `GET/POST` | `/api/newsfeed/[postId]/comments` | List (threaded with replies) / add comments. Supports `parentId` for replies. |
| `POST` | `/api/newsfeed/[postId]/comments/[commentId]/like` | Toggle like on a comment (notifies comment author). |
| `POST` | `/api/newsfeed/[postId]/save` | Save/unsave a post. |
| `PATCH/PUT` | `/api/newsfeed/[postId]/edit` | Edit a post. |

### Roadmap (AI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/roadmap` | List / save roadmaps. |
| `POST` | `/api/roadmap/generate` | Generate a roadmap (not persisted until saved). |
| `GET/PATCH/DELETE` | `/api/roadmap/[id]` | Read / update progress / delete a roadmap. |

### User & Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/PUT` | `/api/user/profile` | Read / update profile. |
| `POST` | `/api/user/avatar` | Upload avatar. |
| `GET/POST/DELETE` | `/api/user/skills` | Manage skills offered. |
| `GET/POST/DELETE` | `/api/user/skills-wanted` | Manage skills wanted. |
| `GET` | `/api/user/wallet` | Get wallet balances. |
| `GET` | `/api/user/transactions` | Get transaction history. |
| `GET/POST` | `/api/user/search-history` | Read / record search history. |
| `GET/PUT` | `/api/user/settings` | Read / update settings. |
| `POST` | `/api/user/change-password` | Change password. |
| `DELETE` | `/api/user/delete-account` | Delete the account. |
| `GET` | `/api/users/[userId]/skills` | Public skills for a user. |
| `GET` | `/api/users/[userId]/posts` | Public posts for a user. |
| `POST` | `/api/users/block` | Block/unblock a user. |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | List notifications. |
| `POST` | `/api/notifications/read` | Mark notification(s) read. |
| `POST` | `/api/notifications/seen` | Mark notification(s) seen. |
| `GET` | `/api/notifications/unread-count` | Get unread count. |
| `GET` | `/api/user/notifications/preferences` | Get email notification preferences. |
| `PUT` | `/api/user/notifications/preferences` | Update email notification preferences. |

### Internal (server-to-server)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/internal/email/notify` | `x-socket-secret` header | Send email notification for new messages (called by socket server). |

### Dashboard & LiveKit
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Aggregated dashboard data. |
| `POST` | `/api/livekit/token` | Mint a LiveKit access token (`roomName`, `userName`, `userId`). |
| `POST` | `/api/livekit/webhook` | Receive & verify LiveKit webhook events. |

### Socket-Server Internal HTTP API
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/internal/notifications` | `x-socket-secret` header | Emit `notification:new` to a user's room (called by the Next.js app). |
| `POST` | `/internal/newsfeed` | `x-socket-secret` header | Broadcast newsfeed events (`post_liked`, `post_commented`, `comment_liked`, `comment_replied`, `post_created`) to all connected clients via Pub/Sub. |

### Request / Response Examples

**Register a user**
```http
POST /api/auth/register
Content-Type: application/json

{ "email": "ada@example.com", "password": "supersecret1", "fullName": "Ada Lovelace" }
```
```json
// 201 Created
{
  "message": "Account created successfully",
  "user": { "id": "clx...", "email": "ada@example.com", "fullName": "Ada Lovelace" }
}
```

**Send a connection request**
```http
POST /api/connections/request
Content-Type: application/json

{ "receiverId": "clx_receiver_id" }
```
```json
// 200 OK
{
  "success": true,
  "message": "Connection request sent successfully",
  "connectionRequest": {
    "id": "clx...", "receiverId": "clx_receiver_id",
    "status": "PENDING", "creditsHeld": 5, "createdAt": "2026-06-03T..."
  }
}
// 400 if insufficient balance / already connected / pending request exists
```

**Mint a LiveKit token**
```http
POST /api/livekit/token
Content-Type: application/json

{ "roomName": "connection_123", "userName": "Ada", "userId": "clx_user" }
```
```json
// 200 OK
{ "token": "<jwt>", "url": "wss://your-livekit-host" }
```

**Generate an AI roadmap**
```http
POST /api/roadmap/generate
Content-Type: application/json

{ "skillName": "Sourdough baking", "proficiencyTarget": "Intermediate" }
```
```json
// 200 OK (content is sanitized server-side; ids regenerated)
{
  "success": true,
  "roadmap": {
    "skillName": "Sourdough baking",
    "proficiencyTarget": "Intermediate",
    "skillWantId": null,
    "content": {
      "title": "...", "summary": "...", "estimatedDuration": "about 3 weeks",
      "prerequisites": ["..."],
      "phases": [{ "id": "p1", "title": "...", "goal": "...", "durationLabel": "Week 1",
        "steps": [{ "id": "p1-s1", "title": "...", "description": "...",
                    "estimatedTime": "2 hours", "resources": ["Hands-on practice"] }] }],
      "milestones": ["..."], "tips": ["..."]
    }
  }
}
```

---

## WebSocket Events

Connect with `socket.io-client`, passing the short-lived JWT:
```ts
const socket = io(NEXT_PUBLIC_SOCKET_URL, {
  auth: { token },                       // from GET /api/auth/socket
  transports: ['websocket', 'polling'],
});
```
On connect, the server joins the socket to a room named after the user's `userId`, so any `io.to(userId).emit(...)` reaches all of that user's devices.

### Client → Server
| Event | Payload | Purpose |
|-------|---------|---------|
| `join_chat` | `connectionId: string` | Join a conversation room. |
| `set_active_conversation` | `{ connectionId: string \| null }` | Suppress notifications for the open chat (stored in Redis, 12h TTL). |
| `get_users_status` | `{ userIds: string[] }` | Request current online status of specific users (max 50). Server responds with `users_status_response`. |
| `send_message` | `{ connectionId, content, tempId, mediaUrl?, mediaType?, mediaName?, mediaSize?, mediaThumbnail? }` | Send a message (validated, rate-limited 5/s, persisted). |
| `mark_message_read` | `{ messageId, connectionId }` | Mark a message read; notifies the sender. |
| `delete_messages` | `{ connectionId, messageIds, deletedBy }` | Notify the peer of deleted messages. |
| `clear_conversation` | `{ connectionId }` | Notify the peer the conversation was cleared. |
| `offer_status_changed` | `{ messageId, connectionId, content }` | Notify the peer that an offer's status changed. |
| `heartbeat` | _none_ | Keep-alive ping (every 30s) for presence. |
| `call:initiate` | `{ recipientId, callType, roomName }` | Ring a recipient (fails if offline). |
| `call:answer` | `{ callerId, connectionId }` | Accept an incoming call. |
| `call:reject` | `{ callerId, connectionId }` | Reject an incoming call. |
| `call:end` | `{ participantId, connectionId }` | End an ongoing call. |

### Server → Client
| Event | Payload | Purpose |
|-------|---------|---------|
| `receive_message` | the saved `Message` | New incoming message. |
| `message_sent` | `{ tempId, savedMessage }` | Ack for a sent message (reconcile optimistic UI). |
| `message_read` | `{ messageId, connectionId, readBy }` | A message you sent was read. |
| `messages_deleted` | `{ connectionId, messageIds, deletedBy }` | Peer deleted messages. |
| `conversation_cleared` | `{ connectionId, clearedBy }` | Peer cleared the conversation. |
| `offer_status_updated` | `{ messageId, connectionId, content }` | Offer status changed. |
| `user_online_status` | `{ userId, isOnline, lastSeenAt, timestamp }` | A user came online. |
| `user_offline_status` | `{ userId, isOnline, lastSeenAt, timestamp }` | A user went offline. |
| `users_status_response` | `{ statuses: [{ userId, isOnline, lastSeenAt }] }` | Response to `get_users_status` request with current status of requested users. |
| `notification:new` | `{ notification }` | New notification (from chat or internal HTTP). |
| `call:incoming` | `{ callerId, callerName, callerImage, callType, roomName, connectionId, timestamp }` | Incoming call. |
| `call:accepted` | `{ participantId, connectionId, timestamp }` | Callee accepted. |
| `call:rejected` | `{ participantId, connectionId, timestamp }` | Call rejected. |
| `call:ended` | `{ participantId, connectionId, timestamp }` | Call ended. |
| `call:failed` | `{ reason, code }` | Call could not be placed (e.g. `USER_OFFLINE`). |
| `error` | `{ message }` | Validation / rate-limit / send error. |

> The client hook (`hooks/useChatSocket.ts`) also registers handlers for `call:ice-candidate` and legacy `user_online` / `user_offline` events; the current server uses LiveKit for media (no manual ICE relay) and the `user_online_status` / `user_offline_status` events for presence.

---

## Database

### Technology
- **PostgreSQL** accessed via **Prisma 7** using the `@prisma/adapter-pg` driver adapter over a `pg` `Pool`.
- Hosted on **Supabase** (the Prisma client auto-switches a `:5432` pooler URL to the transaction pooler `:6543?pgbouncer=true`).
- Connection pool is tuned conservatively for serverless (`max: 2`, idle timeout 10s) in `lib/prisma.ts`.

### Schema Overview

```mermaid
erDiagram
    User ||--o| Wallet : has
    User ||--o{ Skill : offers
    User ||--o{ SkillWant : wants
    User ||--o{ ConnectionRequest : sends
    User ||--o{ Connection : participates
    User ||--o{ Message : sends
    User ||--o{ Session : "learner/provider"
    User ||--o{ Review : "gives/receives"
    User ||--o{ NewsfeedPost : authors
    User ||--o{ Notification : receives
    User ||--o{ LearningRoadmap : owns
    User ||--o{ BlockedUser : blocks
    User ||--o{ Account : "OAuth accounts"
    Wallet ||--o{ Transaction : records
    Connection ||--o{ Message : contains
    Connection ||--o{ Session : hosts
    Session ||--o{ Review : has
    Session ||--o{ SessionCompletion : tracks
    Skill ||--o{ Session : "taught in"
    NewsfeedPost ||--o{ PostLike : has
    NewsfeedPost ||--o{ PostComment : has
    NewsfeedPost ||--o{ SavedPost : "saved as"
    ConnectionRequest ||--o| Transaction : holds
    SessionRequest ||--o| Transaction : holds
```

**Core models** (`@@map` table names in parentheses):
- **Auth/NextAuth**: `Account` (`accounts`), `AuthSession` (`auth_sessions`), `VerificationToken` (`verification_tokens`)
- **Users/Presence**: `User` (`users`), `UserOnlineStatus` (`user_online_status`), `BlockedUser` (`blocked_users`), `SearchHistory` (`search_history`)
- **Skills/Learning**: `Skill` (`skills`), `SkillWant` (`skill_wants`), `LearningRoadmap` (`learning_roadmaps`)
- **Connections/Messaging**: `ConnectionRequest` (`connection_requests`), `Connection` (`connections`), `Message` (`messages`)
- **Sessions/Reviews**: `SessionRequest` (`session_requests`), `Session` (`sessions`), `SessionCompletion` (`session_completions`), `Review` (`reviews`)
- **Credits**: `Wallet` (`wallets`), `Transaction` (`transactions`)
- **Newsfeed**: `NewsfeedPost` (`newsfeed_posts`), `PostLike` (`post_likes`), `PostComment` (`post_comments`), `SavedPost` (`saved_posts`)
- **Notifications/Admin**: `Notification` (`notifications`), `AdminLog` (`admin_logs`), `ReportedContent` (`reported_content`)

> `AdminLog` and `ReportedContent` models exist in the schema, but no admin/moderation API routes or UI were detected — these appear to be **forward-looking / not yet wired up**.

### Migrations
Migrations live in `skill-swap/prisma/migrations`:
```
20260116174601_init
20260116175230_add_auth_models
20260117024642_remove_duplicate_avatar_field
20260117173152_add_saved_posts
20260118045938_add_online_fields
20260603000000_add_learning_roadmap
```
Run them with:
```bash
cd skill-swap
pnpm exec prisma migrate deploy     # production / apply existing
pnpm exec prisma migrate dev        # local development
```

### Seed
- **No seed script is configured** (no `prisma.seed`, no `seed.ts`). New users are bootstrapped at runtime: registration and the NextAuth `createUser` event create a wallet with 100 credits and an `INITIAL_ALLOCATION` transaction. Seeding is therefore **Not detected from codebase**.

---

## Environment Variables

### `skill-swap` (Next.js) — from `.env.example` and code usage

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_SECRET` | Yes | Secret used by NextAuth to sign/encrypt session JWTs. |
| `NEXTAUTH_URL` | Yes | Base URL of the app (used for OAuth callbacks, reset links, logout redirect). |
| `GOOGLE_CLIENT_ID` | For Google login | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | For Google login | Google OAuth client secret. |
| `FACEBOOK_CLIENT_ID` | Optional | Facebook OAuth client ID. |
| `FACEBOOK_CLIENT_SECRET` | Optional | Facebook OAuth client secret. |
| `DATABASE_URL` | Yes | PostgreSQL connection string (shared with socket server). |
| `NEXT_PUBLIC_SUPABASE_URL` | For media uploads | Supabase project URL (storage). |
| `SUPABASE_SERVICE_ROLE_KEY` | For media uploads | Supabase service-role key (server-side storage ops). |
| `SOCKET_SECRET` | Yes | Shared secret for socket JWTs and the internal notifications API. **Must match the socket server.** |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | URL of the WebSocket microservice (client connects here; server emits notifications here). |
| `NEXT_PUBLIC_LIVEKIT_URL` | For calls | LiveKit server/WebSocket URL (client + token response). |
| `LIVEKIT_API_KEY` | For calls | LiveKit API key (token minting + webhook verification). |
| `LIVEKIT_API_SECRET` | For calls | LiveKit API secret. |
| `LLM_API_KEY` | For AI roadmaps | xAI Grok API key. |
| `LLM_MODEL` | See note | Model name for the LLM. **Note:** `lib/llm.ts` reads this with no fallback, so it is effectively required for roadmap generation even though `.env.example` describes it as optional. |
| `RESEND_API_KEY` | Required | Resend API key for transactional emails (password reset, connection request notifications, message notifications). |
| `RESEND_FROM_EMAIL` | Required | Verified sender address for Resend (e.g. `SkillSwap <noreply@yourdomain.com>`). |
| `NODE_ENV` | Auto | Standard Node environment flag (affects error verbosity & Prisma global caching). |

### `socket-server` (WebSocket) — from code usage (no `.env.example` present)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | Same PostgreSQL DB as the Next.js app. |
| `SOCKET_SECRET` | Yes | — | Shared secret to verify socket JWTs and the internal API header. **Must match the app.** |
| `PORT` | No | `4000` | Port the socket server listens on. |
| `NEXTJS_URL` | No | `http://localhost:3000` | Allowed CORS origin for Socket.IO. |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection for the Socket.IO adapter and presence/rate-limiting. |

---

## Deployment

### General
1. Provision **PostgreSQL** (Supabase) and apply migrations from `skill-swap` (`prisma migrate deploy`).
2. Provision **Redis** for the socket server.
3. Create the Supabase Storage bucket **`newsfeed-media`** (public read) for chat/newsfeed media.
4. Deploy the **Next.js app** and the **socket server** as two separate services, each with its own environment variables. Ensure `SOCKET_SECRET` is identical in both and `NEXT_PUBLIC_SOCKET_URL` / `NEXTJS_URL` point at each other.
5. Configure OAuth redirect URIs, LiveKit credentials, the LLM key, and **Resend** (API key + verified domain).
6. If using LiveKit webhooks, point your LiveKit project's webhook at `POST /api/livekit/webhook`.

### Next.js app — Vercel
The web app is deployed on **Vercel** at **[skillswap.savinduamalka.app](https://skillswap.savinduamalka.app/)**.

1. Import the repository into Vercel and set the **Root Directory** to `skill-swap/`.
2. Build command: `pnpm build` (runs `prisma generate && next build`); output is handled by Vercel's Next.js preset.
3. Add all `skill-swap` environment variables (see the table above) in **Project Settings → Environment Variables**. In particular:
   - `NEXTAUTH_URL` → `https://skillswap.savinduamalka.app`
   - `NEXT_PUBLIC_SOCKET_URL` → your Render socket URL (e.g. `https://<service>.onrender.com`)
   - `SOCKET_SECRET` → identical to the Render service's value
4. The Prisma client is tuned for serverless pooling (`max: 2`, Supabase transaction pooler) which suits Vercel's function model.
5. Update Google/Facebook OAuth redirect URIs to the Vercel domain, and point the LiveKit webhook at `https://skillswap.savinduamalka.app/api/livekit/webhook`.

### Socket server — Render
The WebSocket microservice is deployed on **Render** as a Web Service.

1. Create a **Web Service** with **Root Directory** `socket-server/`.
2. Build command: `pnpm install && pnpm exec prisma generate`.
3. Start command: `pnpm start` (`tsx server.ts`).
4. Environment variables: `DATABASE_URL`, `SOCKET_SECRET` (must match Vercel), `NEXTJS_URL=https://skillswap.savinduamalka.app`, `REDIS_URL` (Render Redis / managed Redis), and optionally `PORT` (Render injects its own `PORT`, which the server already honors).
5. The server handles `SIGTERM` for graceful shutdown (closes the HTTP server, Prisma, and Redis clients) — compatible with Render's deploy/restart lifecycle.

> Keep the two services pointed at each other: Vercel's `NEXT_PUBLIC_SOCKET_URL` = the Render URL, and Render's `NEXTJS_URL` = the Vercel URL (used as the Socket.IO CORS origin). `SOCKET_SECRET` must be identical on both.

### Docker
- **Not detected from codebase.** No `Dockerfile`, `docker-compose.yml`, or container config exists. Both platforms (Vercel, Render) deploy directly from Git without containers here.

### CI/CD
- **Not detected from codebase** (no `.github/workflows` or similar). Vercel and Render each provide **Git-based auto-deploy** on push, which serves as the de facto CI/CD.

---

## Development Guide

### Coding standards
- **TypeScript strict mode** is enabled in both packages.
- **ESLint** (`skill-swap/.eslintrc.json`) extends `next/core-web-vitals` and `next/typescript`, and enforces:
  - `prefer-const`, `no-console` (only `warn`/`error` allowed),
  - **ordered imports** (`import/order` with grouped, alphabetized imports and enforced newlines; React/Next pinned first, then `@/components`, `@/lib`, `@/hooks`),
  - `@typescript-eslint/no-unused-vars` (ignores `_`-prefixed),
  - inline **type-only imports** (`consistent-type-imports`),
  - no unnecessary JSX curly braces.
- Run `pnpm lint` and `pnpm type-check` before committing (Next.js app).

### Project conventions
- **Path alias** `@/*` maps to the `skill-swap` root (`tsconfig.json`).
- **App Router** conventions: route handlers in `app/api/**/route.ts`; page components in `app/**/page.tsx`; heavy client logic split into `*-content.tsx` / `*-client.tsx` components.
- **Single source of truth** for data is `skill-swap/prisma/schema.prisma`. The `socket-server/prisma/schema.prisma` is a copy of the same schema — keep them in sync.
- Cross-cutting client state uses **React Context** providers (`contexts/`): wallet, unread messages, notifications, and call state, all mounted in `app/layout.tsx`.
- Server-side secrets are accessed only in route handlers / server libs; client-exposed config uses the `NEXT_PUBLIC_` prefix.
- Credit-affecting operations use **Prisma `$transaction`** for atomicity and always write a `Transaction` ledger row.

### How to contribute
No `CONTRIBUTING.md` exists, so a reasonable workflow is:
1. Create a feature branch off the main branch.
2. Make focused changes; if you touch the data model, edit `skill-swap/prisma/schema.prisma`, create a migration (`prisma migrate dev`), and mirror the schema into `socket-server`.
3. Ensure `pnpm lint` and `pnpm type-check` pass for the Next.js app.
4. Manually verify affected flows (no automated test suite exists yet).
5. Open a pull request describing the change and any new environment variables.

---

## Troubleshooting

### Socket connection fails / messages don't send
- Confirm `SOCKET_SECRET` is **identical** in the Next.js app and the socket server.
- Confirm `NEXT_PUBLIC_SOCKET_URL` (app) and `NEXTJS_URL` (socket server CORS) point at the correct origins.
- The socket JWT expires after **1 minute** — it's only used at connection time; the client re-fetches it via `/api/auth/socket` when reconnecting.
- Ensure **Redis** is reachable (`REDIS_URL`); the adapter and presence depend on it. Redis errors are logged as `Redis Pub/Sub Client Error`.
- A user must be part of an **ACTIVE** connection to send a message, or the server emits `error: "Connection is not active."`.
- Hitting `error: "You are sending messages too fast"` means the 5 msg/sec Redis rate limit tripped.

### Presence shows users offline incorrectly
- Presence relies on heartbeats: client sends `heartbeat` every 30s; the server marks a user offline after 90s without one. Network throttling or background tabs can delay heartbeats.

### LiveKit calls fail
- Verify `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `NEXT_PUBLIC_LIVEKIT_URL` are set; missing values cause `/api/livekit/token` to return `500`.
- `call:failed` with code `USER_OFFLINE` means the recipient is not present in the Redis online set.
- Webhook returning `401` means the `Authorization` header/signature didn't validate against the API secret.

### Media upload fails
- Ensure the Supabase **`newsfeed-media`** bucket exists, RLS is configured/disabled appropriately, and `SUPABASE_SERVICE_ROLE_KEY` is correct (errors are logged in `lib/supabase.ts`).
- Check per-type size limits (images 10 MB, video 100 MB, audio/files 25 MB).

### Database connection issues
- On Supabase, prefer the transaction pooler. The client auto-rewrites `:5432` pooler URLs to `:6543?pgbouncer=true`. For serverless, the pool is intentionally small (`max: 2`).

### AI roadmap errors
- `503 "not configured"` means `LLM_API_KEY` is missing. `429`/`502`/`504` map to provider rate-limit/upstream/timeout conditions. If `LLM_MODEL` is unset, the model field sent to xAI is `undefined` — set `LLM_MODEL` explicitly.

### Debugging tips
- The socket server logs verbosely (connection, send-message, call, disconnect lifecycle) — watch its stdout.
- NextAuth logging is intentionally minimized (only error codes) to avoid leaking tokens; set `debug` carefully if you need more.
- Use `pnpm exec prisma studio` (in `skill-swap`) to inspect the database directly.

---

---

<div align="center">
Built with Next.js, Socket.IO, Prisma, LiveKit, and a credit-powered community spirit.
</div>
