import { Router } from "express";
import { authMiddleware } from "../lib/auth";

const router = Router();

const MAX_REQUESTS = 10;

const ALLOWED_PATH_PREFIXES: string[] = [
  "/posts",
  "/notifications",
  "/chat/chatrooms",
  "/chat/conversations",
  "/marketplace",
];

function isPathAllowed(rawPath: string): boolean {
  const base = rawPath.split("?")[0];
  return ALLOWED_PATH_PREFIXES.some(
    (prefix) => base === prefix || base.startsWith(prefix + "/"),
  );
}

router.post("/batch", authMiddleware, async (req, res) => {
  const { requests } = req.body ?? {};

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

  for (const r of requests) {
    if (!r.id || typeof r.id !== "string") {
      res.status(400).json({ error: "ValidationError", message: "Each request must have a string id" });
      return;
    }
    if (!r.path || typeof r.path !== "string") {
      res.status(400).json({ error: "ValidationError", message: "Each request must have a string path" });
      return;
    }
    const method = (r.method ?? "GET").toUpperCase();
    if (method !== "GET") {
      res.status(400).json({
        error: "ValidationError",
        message: `Only GET requests are supported in batch (got ${method} for id=${r.id})`,
      });
      return;
    }
    if (!isPathAllowed(r.path)) {
      res.status(400).json({
        error: "ValidationError",
        message: `Path not allowed in batch: ${r.path}`,
      });
      return;
    }
  }

  const authHeader = req.headers["authorization"] ?? "";
  const port = process.env["PORT"] ?? "8080";
  const internalBase = `http://127.0.0.1:${port}/api`;

  const t0 = Date.now();

  const responses = await Promise.all(
    (requests as Array<{ id: string; path: string }>).map(async (r) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      try {
        const resp = await fetch(`${internalBase}${r.path}`, {
          method: "GET",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          signal: controller.signal,
        });
        const body = await resp.json().catch(() => null);
        return { id: r.id, status: resp.status, body };
      } catch (err: any) {
        return {
          id: r.id,
          status: 503,
          body: {
            error: "BatchSubrequestFailed",
            message: err?.message ?? "Subrequest failed",
          },
        };
      } finally {
        clearTimeout(timeout);
      }
    }),
  );

  console.log(`[batch] ${requests.length} subrequest(s) completed in ${Date.now() - t0}ms`);

  res.json({ responses });
});

export default router;
