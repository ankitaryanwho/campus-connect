import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const dbUrl = process.env.DEV_DATABASE_URL || process.env.PROD_DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "DEV_DATABASE_URL (development) or PROD_DATABASE_URL (production) must be set.",
  );
}

export const pool = new Pool({ connectionString: dbUrl, max: 25 });
export const db = drizzle(pool, { schema });

export * from "./schema";
