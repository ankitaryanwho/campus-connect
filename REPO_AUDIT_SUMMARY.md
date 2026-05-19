# App Build Risk Review (May 4, 2026)

## Short answer
Yes — there are several real build/startup risks.

## Risks explained in user-impact terms (phone experience)

### 1) JWT secret fallback in backend
- Risk: backend can run with a predictable default secret if `JWT_SECRET` is missing.
- Phone-user impact:
  - Sessions may become invalid unexpectedly if environments use different secrets.
  - In worst cases, token trust is weakened and account/session security can be compromised.
  - Users can see forced logouts, authorization errors, or suspicious account behavior.

### 2) Mobile API URL fallback points to production
- Risk: app defaults to `https://colyx-api.onrender.com/api` when `EXPO_PUBLIC_API_URL` is not set.
- Phone-user impact:
  - Test builds can accidentally hit production data.
  - Users/testers may see “real” posts/chats/wallet state instead of test data.
  - Actions in a dev build can affect production users and create confusing data mix-ups.

### 3) Admin API URL can be empty
- Risk: admin web client uses `VITE_API_URL || ""`.
- Phone-user impact (indirect):
  - Moderation/ops dashboards may fail to load correct backend data.
  - Delayed moderation/support can leave users with unresolved reports, stale bans, or delayed content removals.

### 4) Server hard-fails without `PORT`
- Risk: API process exits immediately if `PORT` is missing or invalid.
- Phone-user impact:
  - App opens but login/feed/chat all fail with network errors.
  - Users may see timeouts, retry loops, blank states, or “cannot reach server” errors.

### 5) Expo dev script uses `--localhost`
- Risk: `expo start --localhost` is brittle for physical-device testing.
- Phone-user impact during testing:
  - App may not open from QR/Expo Go on phone.
  - Live reload and API calls may fail because phone cannot resolve host loopback context.
  - Testers interpret this as “app is broken” even when code is fine.

### 6) Beta React Compiler plugin
- Risk: `babel-plugin-react-compiler` beta can be sensitive to dependency/runtime upgrades.
- Phone-user impact:
  - After dependency updates, some screens can regress (render bugs/crashes/perf anomalies).
  - Problems may appear only on certain devices or OS versions, making them hard to reproduce.

## What end users typically report on phone when these occur
- “Login keeps failing / I get logged out again.”
- “Feed/chat won’t load; it keeps spinning.”
- “Actions succeed but data looks wrong or from another environment.”
- “The app worked yesterday, now it crashes or freezes after update.”

## Recommendation order
1. Require `JWT_SECRET` in production (remove insecure fallback).
2. Make `EXPO_PUBLIC_API_URL` mandatory for non-prod builds (fail fast if missing).
3. Make `VITE_API_URL` explicit for admin deployments.
4. Add deployment startup checks for required env vars (`PORT`, secrets, API URLs).
5. Adjust Expo dev networking mode for physical-device testing workflows.
6. Pin/test React Compiler plugin carefully during Expo/RN upgrades.
