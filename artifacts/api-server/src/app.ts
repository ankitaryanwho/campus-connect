import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import path from "path";
import type { Socket } from "net";
import * as Sentry from "@sentry/node";
import router from "./routes";

const app: Express = express();

app.use(compression({ threshold: 0 }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Track sockets seen in dev to detect genuine TCP connection reuse.
const seenSockets = new WeakSet<Socket>();

// In development, expose the negotiated ALPN protocol so it can be confirmed
// in devtools without needing a packet capture.
// Direct H2 connections are proxied from the H2 server (port+1) to this
// HTTP/1.1 server with an internal x-h2-proxied header; otherwise fall back
// to the socket's ALPN protocol or plain http/1.1.
if (process.env.NODE_ENV !== "production") {
  app.use("/api", (_req, res, next) => {
    if (_req.headers["x-h2-proxied"] === "1") {
      res.setHeader("x-protocol", "h2");
    } else {
      const alpn = (_req.socket as unknown as { alpnProtocol?: string }).alpnProtocol;
      res.setHeader("x-protocol", alpn ?? "http/1.1");
    }
    next();
  });
}

// Scoped to /api: advertise keep-alive when the client permits it,
// and honour explicit Connection: close requests from clients/proxies.
app.use("/api", (req, res, next) => {
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
        // WeakSet entries are automatically eligible for GC once the socket
        // is garbage-collected; the explicit delete is belt-and-suspenders.
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
