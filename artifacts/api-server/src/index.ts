import * as Sentry from "@sentry/node";
import http from "node:http";
import http2 from "node:http2";
import net from "node:net";
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

// Use http.request so Node.js sends a plain HTTP/1.1 keepalive — not an h2c
// upgrade — to the internal HTTP/1.1 server on the routing port.
function startKeepalive(port: number): void {
  setInterval(() => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path: "/api/ping" },
      (res) => { res.resume(); },
    );
    req.on("error", () => { /* silently ignore */ });
    req.end();
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

  // ── Architecture overview ────────────────────────────────────────────────
  //
  // A single net.createServer() on PORT peeks at the first bytes of every
  // TCP connection and routes it to one of two purpose-built inner servers:
  //
  //   h2cServer  — http2.createServer() (no TLS, cleartext H2)
  //                Receives connections whose first bytes match the HTTP/2
  //                client preface.  Http2ServerRequest / Http2ServerResponse
  //                objects are passed to Express; app.ts first-middleware
  //                restores Http2ServerResponse property descriptors after
  //                Express init overwrites the prototype chain.
  //
  //   h1Server   — http.createServer()
  //                Receives all HTTP/1.1 connections (Replit reverse-proxy,
  //                health-checks, keepalive pings, etc.).  Standard
  //                IncomingMessage / ServerResponse objects with no quirks.
  //
  // Why not http2.createServer({ allowHTTP1: true })?
  //   Node.js 24's allowHTTP1 compat path creates ServerResponse objects
  //   whose Symbol-keyed internals (kOutHeaders, kChunkedBuffer, kSocket …)
  //   are undefined rather than null/[].  Every method that touches those
  //   fields (setHeader, removeHeader, _writeRaw …) crashes.  The socket is
  //   owned by the http2 session so replacing the response object via
  //   assignSocket() also fails (garbled HTTP/0.9 output).  Routing at the
  //   net layer gives each protocol a clean, properly-constructed server with
  //   no shared socket-ownership conflicts.
  //
  // Why not http2.createSecureServer (TLS) on PORT?
  //   Replit's reverse-proxy terminates TLS at its edge and reaches our
  //   server over plain TCP; a TLS listener on PORT would be unreachable.
  //   In development a second TLS server on PORT+1 enables ALPN-negotiated
  //   H2 testing; in production the edge proxy handles TLS for clients.
  //
  // spdy: relies on the removed node:http_parser binding (dead on Node ≥ 12).
  // http2-express-bridge: patches express.application.lazyrouter (Express 4).
  // ────────────────────────────────────────────────────────────────────────

  // HTTP/2 connection preface — first 24 bytes of any H2 client connection.
  const H2_PREFACE = Buffer.from("PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n");

  // ── Inner H2C server ─────────────────────────────────────────────────────
  // Listens on an internal loopback port (port+2).  H2 connections from the
  // external router are forwarded via net.createConnection so that nghttp2
  // gets a real OS-level TCP socket handle — .emit('connection', socket)
  // gives nghttp2 an injected stream which it cannot attach to libuv, causing
  // GOAWAY INTERNAL_ERROR before any stream is opened.
  const h2cPort = port + 2;
  const h2cServer = http2.createServer();

  // ── H2 compat: materialise Http2ServerRequest/Response descriptors ───────
  // Express 5's init middleware calls setPrototypeOf(req, app.request) and
  // setPrototypeOf(res, app.response).  Both swap Http2ServerRequest /
  // Http2ServerResponse's prototype chain for an http.IncomingMessage /
  // http.ServerResponse chain, making every H2-specific method and getter
  // (_read, socket, httpVersionMajor, removeHeader, end, …) resolve from
  // the wrong class — causing crashes.
  //
  // Restoring descriptors inside a middleware (after init) is too late:
  // the httpVersionMajor GETTER lives only on Http2ServerRequest.prototype;
  // once setPrototypeOf removes that class from the chain, the getter becomes
  // inaccessible and the guard "req.httpVersionMajor === 2" returns undefined.
  //
  // Solution: restore BEFORE calling app() so that all H2 descriptors are
  // own properties on the instance.  Own properties survive setPrototypeOf.
  // The redundant pass in app.ts first-middleware is now a safe no-op.
  const H2_REQ_DESCS = Object.getOwnPropertyDescriptors(
    http2.Http2ServerRequest.prototype,
  );
  const H2_RES_DESCS = Object.getOwnPropertyDescriptors(
    http2.Http2ServerResponse.prototype,
  );

  function applyH2Descs(
    obj: object,
    descs: ReturnType<typeof Object.getOwnPropertyDescriptors>,
  ): void {
    // Object.entries() silently skips Symbol-keyed properties.
    // Http2ServerResponse.prototype has 3 critical Symbol-keyed functions
    // (Symbol('setHeader'), Symbol('appendHeader'), Symbol('begin-send')) that
    // setHeader / appendHeader / end call via this[kXxx].  After Express's
    // setPrototypeOf removes Http2ServerResponse.prototype from the chain those
    // Symbols become unreachable — we must copy them as own properties too.
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
        // A handful of instance-level non-configurable props cannot be
        // redefined; they keep their original values which is correct.
      }
    }
  }

  h2cServer.on("request", (rawReq: any, rawRes: any) => {
    // Materialise all Http2ServerRequest / Http2ServerResponse prototype
    // properties as own instance properties BEFORE Express's init runs
    // setPrototypeOf and removes them from the prototype chain.
    applyH2Descs(rawReq, H2_REQ_DESCS);
    applyH2Descs(rawRes, H2_RES_DESCS);

    app(rawReq, rawRes);
  });

  h2cServer.on("error", (err: Error) => {
    console.error("[h2c] Error:", err.message);
  });

  h2cServer.keepAliveTimeout = 65000;
  h2cServer.headersTimeout   = 66000;

  await new Promise<void>((resolve) => h2cServer.listen(h2cPort, "127.0.0.1", resolve));
  console.log(`HTTP/2 h2c server listening on internal port ${h2cPort}`);

  // ── Inner HTTP/1.1 server ─────────────────────────────────────────────────
  // Does not need to listen — sockets are injected via .emit('connection').
  // Standard http.createServer gives properly-initialised ServerResponse
  // objects; no Symbol-field patching needed.
  const h1Server = http.createServer();

  h1Server.on("request", app);

  h1Server.on("error", (err: Error) => {
    console.error("[h1] Error:", err.message);
  });

  h1Server.keepAliveTimeout = 65000;
  h1Server.headersTimeout   = 66000;

  // ── Protocol-routing server on PORT ──────────────────────────────────────
  const routerServer = net.createServer((clientSocket) => {
    clientSocket.on("error", () => { /* prevent unhandled crash */ });

    clientSocket.once("data", (firstChunk) => {
      // Determine protocol from first bytes of the connection.
      const isH2 = firstChunk
        .slice(0, H2_PREFACE.length)
        .equals(H2_PREFACE);

      if (isH2) {
        // H2: forward via a real loopback TCP connection so nghttp2 gets a
        // native socket handle.  Write the first chunk immediately (it contains
        // the HTTP/2 client preface + SETTINGS) then pipe the rest.
        const h2cSocket = net.createConnection(h2cPort, "127.0.0.1");
        h2cSocket.on("error", () => clientSocket.destroy());
        clientSocket.on("error", () => h2cSocket.destroy());
        h2cSocket.write(firstChunk);
        clientSocket.pipe(h2cSocket);
        h2cSocket.pipe(clientSocket);
      } else {
        // HTTP/1.1: inject directly into h1Server via .emit('connection').
        // Pause first so the buffer is stable while the http parser attaches
        // its read handler, then resume to start the flow.
        clientSocket.pause();
        clientSocket.unshift(firstChunk);
        h1Server.emit("connection", clientSocket);
        clientSocket.resume();
      }
    });
  });

  routerServer.on("error", (err: Error) => {
    console.error("[router] Error:", err.message);
  });

  routerServer.listen(port, () => {
    console.log(`Server listening on port ${port} (HTTP/2 h2c + HTTP/1.1)`);
    startKeepalive(port);
  });

  // ── Development only: ALPN-negotiated H2 over TLS on PORT+1 ─────────────
  //
  // Allows testing ALPN negotiation and H2 headers with curl --http2 and
  // browser devtools against a real TLS endpoint without configuring the
  // Replit proxy.  Each TLS/H2 stream is proxied as HTTP/1.1 to PORT where
  // it is routed by h1Server and handled by Express.  The x-h2-proxied: 1
  // tag makes the x-protocol middleware in app.ts label the response "h2".
  //
  // Using process.env.NODE_ENV directly in the condition (not via a const
  // variable) so esbuild's define substitution constant-folds it to false
  // and dead-code-eliminates this entire block from the production CJS bundle.
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

        const fwdHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(headers)) {
          if (!k.startsWith(":") && typeof v === "string") {
            fwdHeaders[k] = v;
          }
        }
        fwdHeaders["x-h2-proxied"] = "1";

        const proxyReq = http.request(
          { hostname: "127.0.0.1", port, method, path: rawPath, headers: fwdHeaders },
          (proxyRes) => {
            const resHeaders: http2.OutgoingHttpHeaders = {
              ":status": proxyRes.statusCode ?? 200,
            };

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

        stream.pipe(proxyReq);
      },
    );

    h2Server.on("error", (err: Error) => {
      console.error("[h2-tls] Server error:", err.message);
    });

    h2Server.listen(h2Port, () => {
      console.log(`HTTP/2 TLS server listening on port ${h2Port} (ALPN, H2)`);
    });
  }
}

start().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
