import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import { seedData } from "./lib/seed";
import { runStartupMigrations } from "./lib/migrate";
import { runProductionImport } from "./lib/production-import";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

// Run migrations → production import (if NEON_SOURCE_URL set) → dev seed on startup
runStartupMigrations()
  .then(() => runProductionImport())
  .then(() => seedData())
  .catch(console.error);

export default app;
