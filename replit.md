# CampusConnect Workspace

## Overview

A production-ready college social app — **CampusConnect** — built as a pnpm monorepo with TypeScript. Includes a React Native (Expo) mobile app, an Express 5 API server, a PostgreSQL database, and a **React + Vite Admin Panel**.

## Admin Panel (`artifacts/admin` → `/admin/`)

Dark professional admin dashboard with full CRUD control over the platform.

**Login:** `admin@campusconnect.edu` / `admin123` (role must be `admin` or `super_admin`)

**Pages:**
- **Dashboard** — real-time stat cards + 4 Recharts charts (revenue/day, user growth, orders/day, revenue by service)
- **Users** — paginated table, search/filter by name/email/role/college, ban/unban, change role, delete
- **Services** — tabbed: Assignments | Certifications | Deliveries | Tasks with search+status filter+delete
- **Transactions** — all wallet transactions with date range filter and total volume
- **Posts** — social feed moderation with delete
- **Analytics** — detailed charts over 7/14/30/90 day windows
- **Notifications** — broadcast to all users, students, providers, or admins

**Admin API routes** (`/api/admin/*`):
- `POST /api/admin/auth/login` — admin-only login
- `GET /api/admin/stats` — dashboard metrics
- `GET /api/admin/analytics?days=30` — charts data
- `GET/PUT/DELETE /api/admin/users/:id` — user CRUD
- `POST /api/admin/users/:id/ban` — ban/unban
- `POST /api/admin/users/:id/role` — change role
- `GET/DELETE /api/admin/services/{assignments,certifications,tasks,deliveries}` — service management
- `GET /api/admin/transactions` — all wallet transactions
- `GET/DELETE /api/admin/posts` — post moderation
- `POST /api/admin/notifications/broadcast` — send to all/role-filtered users

**DB:** Added `banned` (boolean, default false) column to `users` table.

### Auth / Registration Flow
- College list is static (5 colleges with domains): Bennett, Amity, Manipal, Sharda, Galgotias
- Signup: select college → enter name/email (domain validated) / password / program / **academic year (1-4)** / phone (optional) → OTP sent → verify OTP → account created
- Service providers additionally select their services (assignments, certifications, deliveries, tasks)
- OTP sent via **Resend** (`RESEND_API_KEY` secret); from address defaults to `onboarding@resend.dev` (override with `RESEND_FROM_EMAIL`)
- `verificationToken` (short-lived JWT) issued after OTP verification, required for `/auth/register`
- Users have `emailVerified=true` after completing OTP flow; `year` and `phone` stored on user
- Provider services stored as JSON array in `users.services` column, shown as badges on profile

## Anonymous Post System

Fully privacy-first anonymous posting with threaded comments, reply system, and anonymous chat.

**DB columns added:**
- `posts.is_anonymous` (boolean, default false)
- `comments.parent_id` (text, nullable — enables threaded replies)
- `conversations.is_anonymous` (boolean, default false)
- `conversations.anonymous_post_id` (text, nullable)

**How it works:**
- Toggle "Post Anonymously" in new-post screen
- Anonymous posts store real `authorId` internally — never sent to frontend
- Other users see: "Profile Hidden • BCA 2nd Year" with a grey ghost avatar
- Tapping the author shows toast: "Anonymous post — profile is hidden"
- Owner sees their own real identity (isOwnPost flag)
- `authorId` field stripped from all API responses (never leaked)
- Threaded replies: comments have `parentId`; response returns `replies[]` per comment
- Anonymous chat: poster can message commenters as "Hidden Profile" — `POST /chat/conversations` with `{isAnonymous: true, anonymousPostId}`
- Notifications for anon posts use generic text ("Someone liked your anonymous post")

**API changes (`/api/posts`):**
- `POST /`: accepts `isAnonymous` boolean
- `GET /, GET /:id`: masks author for anon posts from non-owners
- `GET /:id/comments`: returns threaded `{comments: [{...replies: []}]}`
- `POST /:id/comments`: accepts `parentId` for threaded replies

**Mobile changes:**
- `new-post.tsx`: "Post Anonymously" toggle with live preview of how it will look
- `app/(tabs)/index.tsx`: PostCard + PostMiniCard handle anonymous display
- `app/post/[id].tsx`: Full rewrite — anonymous headers, threaded replies, anonymous chat button, profile-block toast

## Post Management & Verification Badges

**3-dot menu on user's own posts** (Edit / Hide / Delete) appears in feed, profile tab, public profile (when viewing own), and post detail.

**Backend** (`artifacts/api-server/src/routes/posts.ts`):
- `PATCH /api/posts/:id` — owner-only edit. Sets `editedAt` timestamp; rejects content >500 chars.
- `POST /api/posts/:id/hide` / `/unhide` — owner-only visibility toggle.
- `DELETE /api/posts/:id` — owner-only. Cascade-deletes likes/comments, decrements `users.postsCount`.
- `visibilityFilter()` helper hides posts from non-owners in feed (`GET /posts`) and user posts list (`GET /users/:userId/posts`).
- Hidden-post access is enforced on `GET /posts/:id`, `GET/POST /posts/:id/comments`, and `POST /posts/:id/like` — non-owners get 404.
- Schema: `posts.hidden` (boolean, default false), `posts.editedAt` (timestamp, nullable).

**Mobile UI** (Expo):
- `components/PostActionsMenu.tsx` — bottom-sheet menu with Edit modal, Hide/Unhide toggle (Unhide replaces Hide when post is hidden), and confirm-on-Delete (uses `window.confirm` on web, native `Alert.alert` otherwise).
- `components/AuthorBadge.tsx` + `constants/badges.ts` — shared `BADGE_META` map and `resolveBadge()` helper. Renders a small icon next to the author's name everywhere (feed, comments, post detail, profile, public profile).
- Posts display `EDITED` and `HIDDEN` pills above the content when applicable. Hidden posts are still visible to the owner with the HIDDEN pill.

**API base for mobile**: `EXPO_PUBLIC_API_URL` env var, falling back to the deployed Replit app URL (`https://campus-connect-app.replit.app/api`). Backend changes therefore require redeploying the API server before OTA updates of the mobile bundle will exercise them.

## HTTP/2 (Development)

In development, the API server runs **two listeners simultaneously**:

| Port | Protocol | Purpose |
|------|----------|---------|
| `$PORT` (8080) | HTTP/1.1 | Primary — Replit proxy, keepalive, all real traffic |
| `$PORT+1` (8081) | HTTP/2 over TLS | H2 testing only — ALPN negotiation, stream multiplexing |

The H2 server (`http2.createSecureServer`) proxies each incoming HTTP/2 stream to the HTTP/1.1 server via a loopback connection, adding `x-h2-proxied: 1` so Express middleware can set `x-protocol: h2` in the response.

**Why not `allowHTTP1: true`?** Node.js 24's `allowHTTP1` compat layer constructs `ServerResponse` objects non-standardly, leaving all Symbol-keyed internals (`kOutHeaders`, `kChunkedBuffer`, `kSocket` …) as `undefined`. Every `OutgoingMessage` method call crashes. The two-server proxy avoids the compat layer entirely.

**Why not `spdy` / `http2-express-bridge`?** `spdy` uses the removed `node:http_parser` native binding (broken on Node.js ≥ 12). `http2-express-bridge` patches `express.application.lazyrouter` which was removed in Express 5.

In **production**, only the HTTP/1.1 server runs (`app.listen()`). The entire H2 block is dead-code-eliminated from the production CJS bundle by esbuild (`define: { "process.env.NODE_ENV": '"production"' }`).

**Key files:**
- `artifacts/api-server/src/index.ts` — two-server setup + H2 stream proxy
- `artifacts/api-server/src/lib/dev-cert.ts` — embedded self-signed TLS cert (10-year, CN=localhost)
- `artifacts/api-server/src/app.ts` — `x-protocol` header middleware (checks `x-h2-proxied` header)

**Verify:**
```bash
curl -s http://localhost:8080/api/ping -I | grep x-protocol   # → http/1.1
curl --http2 -sk https://localhost:8081/api/ping -I | grep x-protocol  # → h2
```

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo SDK 54 + React Native 0.81 + Expo Router v6

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express 5 API server (port 8080)
│   └── mobile/             # Expo React Native app (port 18115)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## CampusConnect Features

### Mobile App (`artifacts/mobile`)
- **Authentication**: Login / Register with JWT, demo account (priya@campus.edu / password123). Auth screens use "Warm Blobs" design: cream (#FAF8F4) background with purple blob decorations, white rounded card, pill tab switcher, cream inputs with purple icon circles, orange error box, purple CTA button.
- **Social Feed**: Posts, likes, comments, create posts
- **Services Marketplace**: Assignments, Certifications, Delivery, Tasks — full role-based logic
- **Chat**: Direct messages (DMs) + Chatrooms (6 preset rooms), real-time polling
- **Wallet**: Balance, add money, transfer, transaction history
- **Profiles**: User profiles, follow/unfollow, bio/college/program
- **Navigation**: 5-tab layout (Feed, Services, Chat, Wallet, Profile)
- **Design**: Indigo/purple theme (#5B4FE8), Inter font, light/dark mode

### API Server (`artifacts/api-server`)
Routes at `/api/*`:
- `POST /api/auth/register` — create account + wallet
- `POST /api/auth/login` — login, returns JWT
- `GET /api/auth/me` — get current user
- `GET/POST /api/posts` — feed, create post
- `POST /api/posts/:id/like` — toggle like
- `GET/POST /api/posts/:id/comments` — comments
- `GET /api/users/:id` — user profile
- `POST /api/users/:id/follow` — toggle follow
- `PUT /api/users/me/profile` — update profile
- `GET/POST /api/chat/conversations` — DM conversations
- `GET/POST /api/chat/conversations/:id/messages` — DM messages
- `GET /api/chat/chatrooms` — chatroom list
- `GET/POST /api/chat/chatrooms/:id/messages` — chatroom messages
- `GET /api/wallet` — wallet balance
- `GET /api/wallet/transactions` — transaction history
- `POST /api/wallet/add-money` — add funds
- `POST /api/wallet/transfer` — transfer funds
- `GET/POST /api/services/assignments` — assignments marketplace
- `GET/POST /api/services/coaching` — coaching sessions
- `GET/POST /api/services/deliveries` — deliveries
- `GET/POST /api/services/tasks` — tasks
- `GET /api/notifications` — notifications

### Database (`lib/db`)
Tables: users, follows, posts, likes, comments, conversations, messages, chatrooms, wallets, transactions, assignments, coaching_sessions, deliveries, tasks, task_applications, notifications

Seed data: 4 users, wallets, 6 chatrooms, 5 posts

## Key Files

- `artifacts/mobile/app/_layout.tsx` — Root layout with auth gate
- `artifacts/mobile/app/(tabs)/_layout.tsx` — Tab navigation (liquid glass on iOS 26+)
- `artifacts/mobile/contexts/AuthContext.tsx` — Auth state + API helper
- `artifacts/mobile/constants/colors.ts` — Design tokens (light/dark)
- `artifacts/api-server/src/app.ts` — Express app setup
- `artifacts/api-server/src/routes/index.ts` — Route mount point
- `artifacts/api-server/src/lib/auth.ts` — JWT helpers
- `artifacts/api-server/src/lib/seed.ts` — Seed data on startup
- `lib/db/src/schema/index.ts` — Database schema barrel

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — `pnpm run typecheck` (runs `tsc --build --emitDeclarationOnly`)
- **`emitDeclarationOnly`** — we only emit `.d.ts` files; actual JS bundling via esbuild/tsx/vite
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Development Notes

- Mobile API URL: Set via `artifacts/mobile/.env.local` (`EXPO_PUBLIC_API_URL`)
- JWT secret: `campusconnect-secret-key-2024` (set JWT_SECRET env var for production)
- Database seeding: auto-runs on API server startup if no users exist
- Chat polling interval: 3 seconds
- `react-native-haptic-feedback` removed (web incompatible); using `expo-haptics` instead
