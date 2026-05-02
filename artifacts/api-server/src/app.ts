import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(compression({ threshold: 0 }));
app.use(cors());

// Instruct clients and proxies to reuse TCP connections.
app.use((_req, res, next) => {
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Keep-Alive", "timeout=60");
  if (process.env["NODE_ENV"] !== "production") {
    res.on("finish", () => {
      const reused = res.getHeader("Connection") === "keep-alive";
      if (reused) {
        console.debug(`[keep-alive] ${_req.method} ${_req.path} — connection reused`);
      }
    });
  }
  next();
});
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
