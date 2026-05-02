import { EventEmitter } from "events";
import type { Request, Response, NextFunction, IRouter } from "express";

/**
 * Minimal interface for the Express router's internal dispatch method.
 * IRouter does not expose handle() in its public type, so we define it
 * separately and cast once at setRouter() time.
 */
interface RouterHandle {
  handle(req: Request, res: Response, next: NextFunction): void;
}

let _router: RouterHandle | null = null;

export function setRouter(router: IRouter): void {
  _router = router as unknown as RouterHandle;
}

export interface DispatchResult {
  status: number;
  body: unknown;
}

interface MockReq {
  method: string;
  url: string;
  originalUrl: string;
  baseUrl: string;
  path: string;
  headers: Record<string, string>;
  body: Record<string, never>;
  query: Record<string, string>;
  params: Record<string, string>;
  httpVersionMajor: number;
  _body: boolean;
  socket: { remoteAddress: string; encrypted: boolean };
  get(name: string): string | undefined;
  header(name: string): string | undefined;
  is(): boolean;
  accepts(): string;
}

interface MockRes extends EventEmitter {
  statusCode: number;
  headersSent: boolean;
  writableEnded: boolean;
  locals: Record<string, unknown>;
  status(code: number): this;
  setHeader(name: string, value: string): this;
  getHeader(name: string): string | undefined;
  removeHeader(name: string): void;
  json(obj: unknown): this;
  send(body: unknown): this;
  end(body?: unknown): this;
  write(): boolean;
}

/**
 * Dispatch a GET sub-request directly through the Express router without an
 * HTTP round trip.  Real auth, DB, and cache middleware all execute in-process.
 */
export function dispatchInProcess(path: string, authHeader: string): Promise<DispatchResult> {
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
      for (const [k, v] of new URLSearchParams(search)) query[k] = v;
    }

    let settled = false;
    const settle = (status: number, body: unknown): void => {
      if (settled) return;
      settled = true;
      resolve({ status, body });
    };

    const req: MockReq = {
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
      get(name) { return this.headers[name.toLowerCase()]; },
      header(name) { return this.headers[name.toLowerCase()]; },
      is() { return false; },
      accepts() { return "*/*"; },
    };

    const res = new EventEmitter() as MockRes;
    res.statusCode = 200;
    res.headersSent = false;
    res.writableEnded = false;
    res.locals = {};
    const hdrs = new Map<string, string>();

    res.status    = function(code)  { this.statusCode = code; return this; };
    res.setHeader = function(name, value) { hdrs.set(name.toLowerCase(), value); return this; };
    res.getHeader = function(name)  { return hdrs.get(name.toLowerCase()); };
    res.removeHeader = function(name) { hdrs.delete(name.toLowerCase()); };

    res.json = function(obj) {
      this.headersSent = true;
      this.writableEnded = true;
      settle(this.statusCode, obj);
      return this;
    };
    res.send = function(body) {
      this.headersSent = true;
      this.writableEnded = true;
      if (body !== null && typeof body === "object") {
        settle(this.statusCode, body);
      } else if (typeof body === "string") {
        try { settle(this.statusCode, JSON.parse(body)); } catch { settle(this.statusCode, body); }
      } else {
        settle(this.statusCode, body ?? null);
      }
      return this;
    };
    res.end = function(body?) {
      this.headersSent = true;
      this.writableEnded = true;
      settle(this.statusCode, body ?? null);
      return this;
    };
    res.write = function() { return true; };

    router.handle(
      req as unknown as Request,
      res as unknown as Response,
      (err?: unknown) => {
        settle(err ? 500 : 404, {
          error: err ? "InternalError" : "NotFound",
          message: (err as Error)?.message ?? "Route not found",
        });
      },
    );
  });
}
