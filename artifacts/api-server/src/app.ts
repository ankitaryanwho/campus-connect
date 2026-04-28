import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
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
