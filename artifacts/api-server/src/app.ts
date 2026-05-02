import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import http2 from "node:http2";
import path from "path";
import type { Socket } from "net";
import * as Sentry from "@sentry/node";
import router from "./routes";

const app: Express = express();

// ─── HTTP/2 prototype restoration (safety net) ───────────────────────────────
// Express 5's init middleware calls:
//   Object.setPrototypeOf(req, app.request)   → breaks Http2ServerRequest
//   Object.setPrototypeOf(res, app.response)  → breaks Http2ServerResponse
//
// Primary fix is in index.ts: applyH2Descs() materialises all H2 prototype
// descriptors — including Symbol-keyed ones (Symbol(setHeader),
// Symbol(appendHeader), Symbol(begin-send)) — as own instance properties
// BEFORE app() is called.  Own properties survive setPrototypeOf, so the H2
// I/O methods stay reachable after Express swaps the prototype chain.
//
// This middleware is a redundant safety net in case app() is ever invoked
// directly without the pre-restoration step.  It is a no-op when index.ts
// has already run applyH2Descs (properties are already own).
const H2_REQ_DESCS = Object.getOwnPropertyDescriptors(
  http2.Http2ServerRequest.prototype,
);
const H2_RES_DESCS = Object.getOwnPropertyDescriptors(
  http2.Http2ServerResponse.prototype,
);

function restoreH2Descriptors(
  obj: object,
  descs: ReturnType<typeof Object.getOwnPropertyDescriptors>,
): void {
  // Must iterate Symbol-keyed entries too — Object.entries() silently skips
  // them.  Http2ServerResponse.prototype has Symbol(setHeader),
  // Symbol(appendHeader), Symbol(begin-send) that methods call internally.
  const allKeys: (string | symbol)[] = [
    ...Object.keys(descs),
    ...Object.getOwnPropertySymbols(descs),
  ];
  for (const key of allKeys) {
    if (key === "constructor") continue;
    const desc = (descs as any)[key] as PropertyDescriptor;
    try {
      Object.defineProperty(obj, key, { ...desc, configurable: true });
    } catch {
      // Skip any own property that is already non-configurable on the instance.
    }
  }
}

app.use((req, res, next) => {
  if (req.httpVersionMajor === 2) {
    restoreH2Descriptors(req, H2_REQ_DESCS);
    restoreH2Descriptors(res, H2_RES_DESCS);
  }
  next();
});
// ─────────────────────────────────────────────────────────────────────────────

app.use(compression({ threshold: 0 }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Track sockets seen in dev to detect genuine TCP connection reuse.
const seenSockets = new WeakSet<Socket>();

// In development, expose the negotiated protocol so it can be confirmed
// in devtools without needing a packet capture.
//   • Direct h2c connections to PORT:       req.httpVersionMajor === 2
//   • Proxied ALPN/TLS streams from PORT+1: x-h2-proxied: 1 header
//   • Plain HTTP/1.1 (Replit proxy, etc.):  ALPN field or fallback
if (process.env.NODE_ENV !== "production") {
  app.use("/api", (req, res, next) => {
    if (req.httpVersionMajor === 2 || req.headers["x-h2-proxied"] === "1") {
      res.setHeader("x-protocol", "h2");
    } else {
      const alpn = (req.socket as unknown as { alpnProtocol?: string })
        .alpnProtocol;
      res.setHeader("x-protocol", alpn ?? "http/1.1");
    }
    next();
  });
}

// Scoped to /api: manage connection persistence for HTTP/1.1 clients.
// HTTP/2 connections are inherently multiplexed and persistent; Connection
// headers are forbidden for H2 per RFC 7540 §8.1.2.2 — skip them.
app.use("/api", (req, res, next) => {
  if (req.httpVersionMajor === 2) {
    next();
    return;
  }

  const socket = req.socket as Socket;
  const clientWantsClose = (req.headers["connection"] ?? "")
    .toLowerCase()
    .includes("close");

  if (clientWantsClose) {
    res.setHeader("Connection", "close");
  } else {
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Keep-Alive", "timeout=60");
  }

  if (process.env.NODE_ENV !== "production") {
    const isReused = seenSockets.has(socket);
    if (!isReused) {
      seenSockets.add(socket);
      socket.once("close", () => {
        seenSockets.delete(socket);
      });
    } else {
      console.debug(`[keep-alive] ${req.method} ${req.path} — connection reused`);
    }
  }

  next();
});

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

// Timing middleware: log slow responses and report them to Sentry.
// Must be registered before the router so `res.on("finish")` fires correctly.
app.use("/api", (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[slow-api] ${req.method} ${req.path} took ${duration}ms`);
      if (process.env["SENTRY_DSN"]) {
        Sentry.captureMessage("Slow API response", {
          level: "warning",
          extra: { path: req.path, method: req.method, duration },
        });
      }
    }
  });
  next();
});

app.use("/api", router);

const adminDist = path.resolve(process.cwd(), "artifacts/admin/dist/public");
app.use("/admin", express.static(adminDist));
app.get("/admin/*splat", (_req, res) => {
  res.sendFile(path.join(adminDist, "index.html"));
});

// Sentry error handler — must be registered after all routes so it captures
// errors that propagate up from route handlers.
if (process.env["SENTRY_DSN"]) {
  Sentry.setupExpressErrorHandler(app);
}

export default app;
