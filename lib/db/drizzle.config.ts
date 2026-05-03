import { defineConfig } from "drizzle-kit";
import path from "path";

const dbUrl = process.env.PROD_DATABASE_URL;

if (!dbUrl) {
  throw new Error("PROD_DATABASE_URL must be set. Ensure the database is configured.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
