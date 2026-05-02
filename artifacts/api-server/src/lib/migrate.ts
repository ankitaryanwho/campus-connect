import crypto from "node:crypto";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { pool } from "@workspace/db";

// pnpm always sets cwd to the package directory (artifacts/api-server/) when
// running scripts, so this path is stable in both dev (tsx) and production
// (node dist/index.cjs).
const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "../../lib/db/migrations");

export async function runStartupMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id serial PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    const journal = JSON.parse(
      fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta/_journal.json"), "utf8")
    ) as { entries: Array<{ idx: number; tag: string; when: number }> };

    const { rows: migrationRows } = await client.query<{ created_at: string }>(
      `SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;`
    );
    const trackedTimestamps = new Set(migrationRows.map((r) => Number(r.created_at)));

    for (const entry of journal.entries) {
      if (trackedTimestamps.has(entry.when)) continue;

      // 0000 uses plain CREATE TABLE; baseline it on existing databases so
      // Drizzle does not attempt to re-run it.
      if (entry.idx === 0) {
        const { rows } = await client.query<{ exists: boolean }>(`
          SELECT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'public' AND tablename = 'users'
          ) AS exists;
        `);
        if (rows[0]?.exists) {
          const sql = fs.readFileSync(path.join(MIGRATIONS_FOLDER, `${entry.tag}.sql`), "utf8");
          const hash = crypto.createHash("sha256").update(sql).digest("hex");
          await client.query(
            `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2);`,
            [hash, entry.when]
          );
          console.log(`[migrate] Baselined existing migration: ${entry.tag}`);
        }
      }
      // 0001 uses CREATE INDEX IF NOT EXISTS throughout — safe to run on any
      // database, so no baselining is needed; Drizzle's migrate() handles it.
    }

    const db = drizzle(client);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_messages (
        id text PRIMARY KEY,
        order_id text NOT NULL,
        order_type text NOT NULL,
        sender_id text NOT NULL REFERENCES users(id),
        content text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS order_messages_order_id_idx ON order_messages(order_id);
    `);
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb;
    `);
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_listings (
        id text PRIMARY KEY,
        seller_id text NOT NULL REFERENCES users(id),
        listing_type text NOT NULL,
        item_category text NOT NULL DEFAULT 'other',
        title text NOT NULL,
        description text NOT NULL DEFAULT '',
        photos text NOT NULL DEFAULT '[]',
        price numeric(12,2) NOT NULL,
        rental_unit text,
        status text NOT NULL DEFAULT 'active',
        college text,
        views_count integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS marketplace_listings_seller_idx ON marketplace_listings(seller_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS marketplace_listings_status_idx ON marketplace_listings(status);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketplace_offers (
        id text PRIMARY KEY,
        listing_id text NOT NULL REFERENCES marketplace_listings(id),
        buyer_id text NOT NULL REFERENCES users(id),
        amount numeric(12,2) NOT NULL,
        message text,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS marketplace_offers_listing_idx ON marketplace_offers(listing_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS marketplace_offers_buyer_idx ON marketplace_offers(buyer_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS conversations_participants_idx ON conversations(participant1_id, participant2_id);
    `);

    console.log("[migrate] Startup migrations complete");
  } finally {
    client.release();
  }
}
