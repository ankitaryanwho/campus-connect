import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import { seedData } from "./lib/seed";
import { runStartupMigrations } from "./lib/migrate";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

// Run migrations then seed on startup
runStartupMigrations()
  .then(() => seedData())
  .catch(console.error);

export default app;
