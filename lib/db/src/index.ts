import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const dbUrl = process.env.PROD_DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "PROD_DATABASE_URL must be set. Did you forget to configure the database?",
  );
}

export const pool = new Pool({ connectionString: dbUrl, max: 25 });
export const db = drizzle(pool, { schema });

export * from "./schema";
