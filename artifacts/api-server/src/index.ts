import app from "./app";
import { runStartupMigrations } from "./lib/migrate";
import { runProductionImport } from "./lib/production-import";
import { seedData } from "./lib/seed";

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

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    startKeepalive(port);
  });
}

start().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
