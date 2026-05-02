import { EventEmitter } from "events";
import type { IRouter } from "express";

let _router: IRouter | null = null;

export function setRouter(router: IRouter): void {
  _router = router;
}

export interface DispatchResult {
  status: number;
  body: unknown;
}

/**
 * Dispatch a GET sub-request directly through the Express router — no TCP round
 * trip, no loopback socket.  All real middleware (auth, DB, cache) runs in-
 * process, only the compression / CORS / body-parser app-level middleware is
 * skipped (irrelevant for cached GET responses).
 */
export function dispatchInProcess(
  path: string,
  authHeader: string,
): Promise<DispatchResult> {
  const router = _router;
  if (!router) {
    return Promise.resolve({
      status: 503,
      body: { error: "RouterNotReady", message: "Router reference not yet set" },
    });
  }

  return new Promise<DispatchResult>((resolve) => {
    const qIdx = path.indexOf("?");
    const pathname = qIdx === -1 ? path : path.slice(0, qIdx);
    const search   = qIdx === -1 ? "" : path.slice(qIdx + 1);

    const query: Record<string, string> = {};
    if (search) {
      for (const [k, v] of new URLSearchParams(search)) {
        query[k] = v;
      }
    }

    let settled = false;
    const settle = (status: number, body: unknown): void => {
      if (settled) return;
      settled = true;
      resolve({ status, body });
    };

    // ── Mock request ───────────────────────────────────────────────────────────
    const req: Record<string, unknown> = {
      method: "GET",
      url: path,
      originalUrl: path,
      baseUrl: "",
      path: pathname,
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: {},
      query,
      params: {},
      httpVersionMajor: 1,
      _body: true,
      socket: { remoteAddress: "127.0.0.1", encrypted: false },
      get(name: string): string | undefined {
        return (this.headers as Record<string, string>)[name.toLowerCase()];
      },
      header(name: string): string | undefined {
        return (this.headers as Record<string, string>)[name.toLowerCase()];
      },
      is(): boolean { return false; },
      accepts(): string { return "*/*"; },
    };

    // ── Mock response ──────────────────────────────────────────────────────────
    const res: Record<string, unknown> = new EventEmitter() as unknown as Record<string, unknown>;
    (res as any).statusCode = 200;
    (res as any).headersSent = false;
    (res as any).writableEnded = false;
    (res as any).locals = {};
    const _headers = new Map<string, string>();

    (res as any).status = function(code: number) {
      (res as any).statusCode = code;
      return res;
    };
    (res as any).setHeader = function(name: string, value: string) {
      _headers.set(name.toLowerCase(), value);
      return res;
    };
    (res as any).getHeader = function(name: string): string | undefined {
      return _headers.get(name.toLowerCase());
    };
    (res as any).removeHeader = function(name: string) {
      _headers.delete(name.toLowerCase());
    };
    (res as any).json = function(obj: unknown) {
      (res as any).headersSent = true;
      (res as any).writableEnded = true;
      settle((res as any).statusCode, obj);
      return res;
    };
    (res as any).send = function(body: unknown) {
      (res as any).headersSent = true;
      (res as any).writableEnded = true;
      if (body !== null && typeof body === "object") {
        settle((res as any).statusCode, body);
      } else if (typeof body === "string") {
        try { settle((res as any).statusCode, JSON.parse(body)); }
        catch { settle((res as any).statusCode, body); }
      } else {
        settle((res as any).statusCode, body ?? null);
      }
      return res;
    };
    (res as any).end = function(body?: unknown) {
      (res as any).headersSent = true;
      (res as any).writableEnded = true;
      settle((res as any).statusCode, body ?? null);
      return res;
    };
    (res as any).write = function(): boolean { return true; };

    router.handle(
      req as any,
      res as any,
      (err?: Error) => {
        settle(
          err ? 500 : 404,
          {
            error: err ? "InternalError" : "NotFound",
            message: err?.message ?? "Route not found in batch dispatch",
          },
        );
      },
    );
  });
}
