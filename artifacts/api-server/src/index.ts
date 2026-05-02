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

// Sends an HTTP/1.1 keepalive so the routing server's idle-timeout does not
// close connections while the app is quiet.
function startKeepalive(routerPort: number): void {
  setInterval(() => {
    const req = http.request(
      { hostname: "127.0.0.1", port: routerPort, path: "/api/ping" },
      (res) => { res.resume(); },
    );
    req.on("error", () => { /* ignore */ });
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

  // ── Architecture ──────────────────────────────────────────────────────────
  // net.createServer() on PORT peeks at each connection's first bytes.
  // Connections matching the HTTP/2 client preface are forwarded to h2cServer
  // (port+2) via a real loopback TCP socket — nghttp2 requires an OS-level
  // socket handle; injecting via emit('connection') causes GOAWAY INTERNAL_ERROR.
  // All other connections are injected into h1Server (no TLS, standard HTTP/1.1).
  //
  // http2.createServer({ allowHTTP1: true }) is not used: Node 24's allowHTTP1
  // compat path leaves Symbol-keyed internals (kOutHeaders, kChunkedBuffer …)
  // undefined on HTTP/1.1 ServerResponse objects, crashing every setHeader call.
  // spdy is not used: its http-deceiver transitive dep calls process.binding
  // ('http_parser'), removed from Node since v12.
  // ─────────────────────────────────────────────────────────────────────────

  const H2_PREFACE = Buffer.from("PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n");

  // ── H2 prototype restoration ──────────────────────────────────────────────
  // Express 5's init calls setPrototypeOf(req, app.request) and
  // setPrototypeOf(res, app.response), replacing the Http2ServerRequest /
  // Http2ServerResponse prototype chain with HTTP/1.1 classes.  All H2-specific
  // methods and getters then resolve from the wrong class.
  //
  // Fix: materialise every descriptor from Http2ServerRequest/Response.prototype
  // as an own property on req/res BEFORE calling app().  Own properties survive
  // setPrototypeOf.  Must use Reflect.ownKeys (not Object.keys) to include
  // Symbol-keyed descriptors: Http2ServerResponse.prototype carries three
  // Symbol-keyed functions (Symbol(setHeader), Symbol(appendHeader),
  // Symbol(begin-send)) that setHeader/appendHeader/end call internally.
  type AnyDescs = Record<string | symbol, PropertyDescriptor>;

  const H2_REQ_DESCS = Object.getOwnPropertyDescriptors(
    http2.Http2ServerRequest.prototype,
  ) as AnyDescs;

  const H2_RES_DESCS = Object.getOwnPropertyDescriptors(
    http2.Http2ServerResponse.prototype,
  ) as AnyDescs;

  function applyH2Descs(obj: object, descs: AnyDescs): void {
    for (const key of Reflect.ownKeys(descs)) {
      if (key === "constructor") continue;
      try {
        Object.defineProperty(obj, key, { ...descs[key], configurable: true });
      } catch {
        // A non-configurable own property already on the instance — skip.
      }
    }
  }

  // ── H2C inner server (loopback, port+2) ──────────────────────────────────
  const h2cPort = port + 2;
  const h2cServer = http2.createServer();

  h2cServer.on(
    "request",
    (req: http2.Http2ServerRequest, res: http2.Http2ServerResponse) => {
      applyH2Descs(req, H2_REQ_DESCS);
      applyH2Descs(res, H2_RES_DESCS);
      app(req, res);
    },
  );

  h2cServer.on("error", (err: Error) => {
    console.error("[h2c] Error:", err.message);
  });

  h2cServer.keepAliveTimeout = 65000;
  h2cServer.headersTimeout   = 66000;

  await new Promise<void>((resolve) => h2cServer.listen(h2cPort, "127.0.0.1", resolve));
  console.log(`HTTP/2 h2c server listening on internal port ${h2cPort}`);

  // ── HTTP/1.1 inner server ─────────────────────────────────────────────────
  const h1Server = http.createServer();

  h1Server.on("request", app);

  h1Server.on("error", (err: Error) => {
    console.error("[h1] Error:", err.message);
  });

  h1Server.keepAliveTimeout = 65000;
  h1Server.headersTimeout   = 66000;

  // ── Protocol-routing server on PORT ──────────────────────────────────────
  // Accumulates bytes until at least H2_PREFACE.length are available before
  // deciding — a single TCP segment may deliver fewer than 24 bytes.
  const routerServer = net.createServer((clientSocket) => {
    clientSocket.on("error", () => clientSocket.destroy());

    const chunks: Buffer[] = [];
    let totalLen = 0;

    const onData = (chunk: Buffer): void => {
      chunks.push(chunk);
      totalLen += chunk.length;
      if (totalLen < H2_PREFACE.length) return; // wait for more bytes

      clientSocket.removeListener("data", onData);
      const head = Buffer.concat(chunks);
      const isH2 = head.subarray(0, H2_PREFACE.length).equals(H2_PREFACE);

      if (isH2) {
        const h2cSocket = net.createConnection(h2cPort, "127.0.0.1");
        h2cSocket.on("error", () => clientSocket.destroy());
        clientSocket.on("error", () => h2cSocket.destroy());
        h2cSocket.write(head);
        clientSocket.pipe(h2cSocket);
        h2cSocket.pipe(clientSocket);
      } else {
        clientSocket.pause();
        clientSocket.unshift(head);
        h1Server.emit("connection", clientSocket);
        clientSocket.resume();
      }
    };

    clientSocket.on("data", onData);
  });

  routerServer.on("error", (err: Error) => {
    console.error("[router] Error:", err.message);
  });

  routerServer.listen(port, () => {
    console.log(`Server listening on port ${port} (HTTP/2 h2c + HTTP/1.1)`);
    startKeepalive(port);
  });

  // ── Development only: ALPN TLS on PORT+1 ─────────────────────────────────
  // http2.createSecureServer with a self-signed cert for direct H2/ALPN
  // testing (curl --http2, browser devtools).  Each H2 stream is proxied as
  // HTTP/1.1 to PORT, tagged x-h2-proxied:1 so app.ts labels the response h2.
  // process.env.NODE_ENV is referenced directly (not via a const) so esbuild's
  // define substitution can constant-fold and dead-code-eliminate this block
  // from the production CJS bundle.
  if (process.env.NODE_ENV !== "production") {
    const { DEV_KEY, DEV_CERT } = await import("./lib/dev-cert");

    const h2Port = port + 1;
    const h2Server = http2.createSecureServer({ key: DEV_KEY, cert: DEV_CERT });

    h2Server.on(
      "stream",
      (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders) => {
        stream.on("error", () => stream.destroy());

        const method  = String(headers[":method"] ?? "GET");
        const rawPath = String(headers[":path"]   ?? "/");

        const fwdHeaders: Record<string, string> = { "x-h2-proxied": "1" };
        for (const [k, v] of Object.entries(headers)) {
          if (!k.startsWith(":") && typeof v === "string") {
            fwdHeaders[k] = v;
          }
        }

        const proxyReq = http.request(
          { hostname: "127.0.0.1", port, method, path: rawPath, headers: fwdHeaders },
          (proxyRes) => {
            // HTTP/2 forbids connection-specific headers (RFC 7540 §8.1.2.2).
            const h1Only = new Set([
              "connection", "keep-alive", "transfer-encoding",
              "upgrade", "proxy-connection", "te",
            ]);
            const resHeaders: http2.OutgoingHttpHeaders = {
              ":status": proxyRes.statusCode ?? 200,
            };
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
      console.error("[h2-tls] Error:", err.message);
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
