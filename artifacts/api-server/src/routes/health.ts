import * as Sentry from "@sentry/node";
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/ping", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Test endpoint: sends a test error to Sentry so you can verify the DSN is
// wired up correctly. Only available outside production to avoid noise/cost.
// Hit GET /api/sentry-test in development and check your Sentry dashboard.
router.get("/sentry-test", (_req, res) => {
  if (process.env["NODE_ENV"] === "production") {
    res.status(404).json({ ok: false, error: "Not found" });
    return;
  }
  if (!process.env["SENTRY_DSN"]) {
    res.status(503).json({ ok: false, error: "SENTRY_DSN not configured" });
    return;
  }
  Sentry.captureException(new Error("Sentry test error from /api/sentry-test — DSN verified"));
  res.json({ ok: true, message: "Test error sent to Sentry — check your dashboard." });
});

export default router;
