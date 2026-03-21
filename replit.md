# CampusConnect Workspace

## Overview

A production-ready college social app — **CampusConnect** — built as a pnpm monorepo with TypeScript. Includes a React Native (Expo) mobile app, an Express 5 API server, and a PostgreSQL database.

### Auth / Registration Flow
- College list is static (5 colleges with domains): Bennett, Amity, Manipal, Sharda, Galgotias
- Signup: select college → enter name/email (domain validated) / password / program / **academic year (1-4)** / phone (optional) → OTP sent → verify OTP → account created
- Service providers additionally select their services (assignments, certifications, deliveries, tasks)
- OTP sent via Gmail SMTP (nodemailer); credentials in SMTP_USER / SMTP_PASS secrets
- `verificationToken` (short-lived JWT) issued after OTP verification, required for `/auth/register`
- Users have `emailVerified=true` after completing OTP flow; `year` and `phone` stored on user
- Provider services stored as JSON array in `users.services` column, shown as badges on profile

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
- **Authentication**: Login / Register with JWT, demo account (priya@campus.edu / password123)
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
