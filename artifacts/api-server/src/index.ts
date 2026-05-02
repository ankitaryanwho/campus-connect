import * as Sentry from "@sentry/node";
import app from "./app";
import { runStartupMigrations } from "./lib/migrate";
import { runProductionImport } from "./lib/production-import";
import { seedData } from "./lib/seed";

// Initialise Sentry as early as possible so all unhandled errors and slow
// spans are captured before the server starts accepting requests.
if (process.env["SENTRY_DSN"]) {
  Sentry.init({
    dsn: process.env["SENTRY_DSN"],
    tracesSampleRate: 0.2,
    environment: process.env["NODE_ENV"] ?? "development",
  });
  console.log("[sentry] Initialised");
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const PING_INTERVAL_MS = 4 * 60 * 1000;

function startKeepalive(port: number) {
  const pingUrl = `http://localhost:${port}/api/ping`;
  setInterval(async () => {
    try {
      await fetch(pingUrl);
    } catch {
      // silently ignore — server may briefly be restarting
    }
  }, PING_INTERVAL_MS);
}

async function start() {
  console.log("[startup] Running migrations...");
  await runStartupMigrations();

  console.log("[startup] Running production import (if configured)...");
  const importResult = await runProductionImport();
  console.log("[startup] Import result:", JSON.stringify(importResult));

  console.log("[startup] Seeding data...");
  await seedData();

  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    startKeepalive(port);
  });

  // Keep TCP connections alive longer than Replit's proxy keepalive window
  // so the mobile app can reuse connections across sequential API calls.
  server.keepAliveTimeout = 65000;
  // headersTimeout must exceed keepAliveTimeout to avoid a race condition
  // where the proxy sends a new request on a reused connection just as the
  // server is closing it.
  server.headersTimeout = 66000;
}

start().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
