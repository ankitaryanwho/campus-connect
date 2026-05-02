import * as Sentry from "@sentry/node";
import http from "node:http";
import http2 from "node:http2";
import app from "./app";
import { runStartupMigrations } from "./lib/migrate";
import { runProductionImport } from "./lib/production-import";
import { seedData } from "./lib/seed";

if (process.env["SENTRY_DSN"]) {
  Sentry.init({
    dsn: process.env["SENTRY_DSN"],
    tracesSampleRate: 0.2,
    environment: process.env.NODE_ENV ?? "development",
  });
  console.log("[sentry] Initialised");
  Sentry.captureMessage("[sentry] Server started — DSN verified", "info");
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
  setInterval(() => {
    fetch(`http://localhost:${port}/api/ping`).catch(() => { /* silently ignore */ });
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

  // Primary server: standard HTTP/1.1.
  // In development this is the server the Replit reverse-proxy reaches; in
  // production it is the only server (TLS is terminated by Replit's edge).
  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    startKeepalive(port);
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  // Development only: HTTP/2 over TLS on port+1.
  //
  // Node.js 24's http2 allowHTTP1 compatibility layer constructs ServerResponse
  // objects without calling the OutgoingMessage constructor, leaving all
  // Symbol-keyed internals (kOutHeaders, kChunkedBuffer, kSocket …) as
  // undefined. Using allowHTTP1 is therefore not viable; instead we run a
  // dedicated H2-only TLS server on a secondary port and proxy each H2 stream
  // to the HTTP/1.1 Express server on the primary port via a loopback
  // connection. This gives genuine ALPN-negotiated HTTP/2 without touching
  // the compat layer and keeps the primary port fully HTTP/1.1 backward-
  // compatible.
  //
  // spdy was also evaluated: it relies on the removed node:http_parser native
  // binding and does not load on Node.js ≥ 12. http2-express-bridge patches
  // express.application.lazyrouter which was removed in Express 5.
  //
  // Using process.env.NODE_ENV directly (not via a const variable) so that
  // esbuild's define substitution constant-folds the condition to false and
  // dead-code-eliminates this entire block from the production CJS bundle.
  if (process.env.NODE_ENV !== "production") {
    const { DEV_KEY, DEV_CERT } = await import("./lib/dev-cert");

    const h2Port = port + 1;

    const h2Server = http2.createSecureServer({ key: DEV_KEY, cert: DEV_CERT });

    h2Server.on(
      "stream",
      (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders) => {
        stream.on("error", () => { /* prevent unhandled-error crash */ });

        const method  = String(headers[":method"] ?? "GET");
        const rawPath = String(headers[":path"]   ?? "/");

        // Build HTTP/1.1 request headers, dropping H2 pseudo-headers.
        const fwdHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(headers)) {
          if (!k.startsWith(":") && typeof v === "string") {
            fwdHeaders[k] = v;
          }
        }
        // Tag the proxied request so Express middleware can set x-protocol: h2
        fwdHeaders["x-h2-proxied"] = "1";

        const proxyReq = http.request(
          { hostname: "127.0.0.1", port, method, path: rawPath, headers: fwdHeaders },
          (proxyRes) => {
            const resHeaders: http2.OutgoingHttpHeaders = { ":status": proxyRes.statusCode ?? 200 };

            // HTTP/2 forbids connection-specific headers (RFC 7540 §8.1.2.2).
            const h1Only = new Set([
              "connection", "keep-alive", "transfer-encoding",
              "upgrade", "proxy-connection", "te",
            ]);
            for (const [k, v] of Object.entries(proxyRes.headers)) {
              if (!h1Only.has(k.toLowerCase())) {
                resHeaders[k] = v as string;
              }
            }

            if (!stream.destroyed) {
              stream.respond(resHeaders);
              proxyRes.pipe(stream);
            }
          },
        );

        proxyReq.on("error", () => {
          if (!stream.destroyed) {
            stream.respond({ ":status": 502 });
            stream.end();
          }
        });

        // Pipe request body from H2 stream to the proxy request.
        stream.pipe(proxyReq);
      },
    );

    h2Server.on("error", (err) => {
      console.error("[h2] Server error:", err.message);
    });

    h2Server.listen(h2Port, () => {
      console.log(`HTTP/2 server listening on port ${h2Port} (TLS, H2)`);
    });
  }
}

start().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
