import { defineConfig } from "drizzle-kit";
import path from "path";

const dbUrl = process.env.DEV_DATABASE_URL || process.env.PROD_DATABASE_URL;

if (!dbUrl) {
  throw new Error("DEV_DATABASE_URL (development) or PROD_DATABASE_URL (production) must be set.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
