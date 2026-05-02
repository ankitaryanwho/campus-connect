import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import path from "path";
import type { Socket } from "net";
import router from "./routes";

const app: Express = express();

app.use(compression({ threshold: 0 }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Track sockets seen in dev to detect genuine TCP connection reuse.
const seenSockets = new WeakSet<Socket>();

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

  if (process.env["NODE_ENV"] !== "production") {
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

app.use("/api", router);

const adminDist = path.resolve(process.cwd(), "artifacts/admin/dist/public");
app.use("/admin", express.static(adminDist));
app.get("/admin/*splat", (_req, res) => {
  res.sendFile(path.join(adminDist, "index.html"));
});

export default app;
