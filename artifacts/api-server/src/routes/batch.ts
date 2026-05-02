import { Router } from "express";
import * as Sentry from "@sentry/node";
import { authMiddleware } from "../lib/auth";
import { dispatchInProcess } from "../lib/batchDispatch";

const router = Router();

const MAX_REQUESTS = 10;

/**
 * Exact set of startup GET paths permitted in a batch call.
 * Query strings are allowed (e.g. /marketplace?type=all) but the base path
 * must be in this set.  SSE streams, uploads, paginated sub-paths, and all
 * mutations are intentionally excluded.
 */
const ALLOWED_BASE_PATHS = new Set([
  "/posts",
  "/notifications",
  "/chat/chatrooms",
  "/chat/conversations",
  "/marketplace",
]);

function isPathAllowed(rawPath: string): boolean {
  const base = rawPath.includes("?") ? rawPath.slice(0, rawPath.indexOf("?")) : rawPath;
  return ALLOWED_BASE_PATHS.has(base);
}

router.post("/batch", authMiddleware, async (req, res) => {
  const { requests } = (req.body ?? {}) as Record<string, unknown>;

  if (!Array.isArray(requests) || requests.length === 0) {
    res.status(400).json({
      error: "ValidationError",
      message: "requests must be a non-empty array",
    });
    return;
  }

  if (requests.length > MAX_REQUESTS) {
    res.status(400).json({
      error: "ValidationError",
      message: `Too many requests — maximum is ${MAX_REQUESTS}`,
    });
    return;
  }

  for (const r of requests as Array<Record<string, unknown>>) {
    if (!r["id"] || typeof r["id"] !== "string") {
      res.status(400).json({ error: "ValidationError", message: "Each request must have a string id" });
      return;
    }
    if (!r["path"] || typeof r["path"] !== "string") {
      res.status(400).json({ error: "ValidationError", message: "Each request must have a string path" });
      return;
    }
    const method = ((r["method"] as string | undefined) ?? "GET").toUpperCase();
    if (method !== "GET") {
      res.status(400).json({
        error: "ValidationError",
        message: `Only GET requests are supported in batch (got ${method} for id=${r["id"]})`,
      });
      return;
    }
    if (!isPathAllowed(r["path"] as string)) {
      res.status(400).json({
        error: "ValidationError",
        message: `Path not allowed in batch: ${r["path"]}`,
      });
      return;
    }
  }

  const authHeader = (req.headers["authorization"] as string) ?? "";
  const t0 = Date.now();

  const responses = await Sentry.startSpan(
    {
      name: "batch.startup",
      op: "batch",
      attributes: { "batch.count": requests.length },
    },
    async () =>
      Promise.all(
        (requests as Array<{ id: string; path: string }>).map(async (r) =>
          Sentry.startSpan(
            { name: `subrequest ${r.path}`, op: "batch.subrequest", attributes: { "batch.id": r.id } },
            async (span) => {
              const subStart = Date.now();
              try {
                const result = await dispatchInProcess(r.path, authHeader);
                const elapsed = Date.now() - subStart;
                if (elapsed > 500) {
                  span.setAttribute("batch.slow", true);
                  console.warn(`[batch] slow subrequest: ${r.path} took ${elapsed}ms`);
                }
                span.setAttribute("http.status_code", result.status);
                return { id: r.id, status: result.status, body: result.body };
              } catch (err: unknown) {
                span.setAttribute("error", true);
                return {
                  id: r.id,
                  status: 503,
                  body: {
                    error: "BatchSubrequestFailed",
                    message: (err as Error)?.message ?? "Subrequest failed",
                  },
                };
              }
            },
          ),
        ),
      ),
  );

  console.log(`[batch] ${requests.length} subrequest(s) completed in ${Date.now() - t0}ms`);

  res.json({ responses });
});

export default router;
