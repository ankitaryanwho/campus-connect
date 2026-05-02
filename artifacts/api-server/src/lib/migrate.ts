import crypto from "node:crypto";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "@workspace/db";

const MIGRATIONS_FOLDER = path.resolve(
  fileURLToPath(import.meta.url),
  "../../../../../lib/db/migrations"
);

export async function runStartupMigrations() {
  const client = await pool.connect();
  try {
    // ── Drizzle migration runner ──────────────────────────────────────────────
    // This project was originally set up with drizzle-kit push (no migration
    // files). Migration 0000 is a full schema bootstrap that cannot run on
    // existing databases because the tables already exist. We baseline it by
    // inserting its tracking record into drizzle.__drizzle_migrations so that
    // Drizzle skips it and only applies incremental migrations (0001+).
    //
    // The baseline hash and timestamp are derived from the actual migration
    // files on disk, so they stay correct if the files are ever regenerated.

    await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id serial PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    const { rows: tableCheck } = await client.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'users'
      ) AS exists;
    `);
    const { rows: migrationCheck } = await client.query(
      `SELECT id FROM drizzle.__drizzle_migrations LIMIT 1;`
    );

    if (tableCheck[0]?.exists && migrationCheck.length === 0) {
      // Existing database without migration history: baseline migration 0000
      // (schema bootstrap) by computing its hash from the SQL file on disk.
      const journal = JSON.parse(
        fs.readFileSync(
          path.join(MIGRATIONS_FOLDER, "meta/_journal.json"),
          "utf8"
        )
      ) as { entries: Array<{ idx: number; tag: string; when: number }> };

      const baseline = journal.entries[0];
      const baselineSql = fs.readFileSync(
        path.join(MIGRATIONS_FOLDER, `${baseline.tag}.sql`),
        "utf8"
      );
      const baselineHash = crypto
        .createHash("sha256")
        .update(baselineSql)
        .digest("hex");

      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2);`,
        [baselineHash, baseline.when]
      );
      console.log("[migrate] Baselined schema bootstrap migration (existing database)");
    }

    const db = drizzle(client);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    // ── Legacy / supplemental raw SQL ─────────────────────────────────────────
    // Tables and columns added before Drizzle migration tracking was
    // introduced. All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF
    // NOT EXISTS) and coexist safely with the Drizzle runner above.

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

    // ── Marketplace ───────────────────────────────────────────────────────────
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
  } catch (err) {
    console.error("[migrate] Startup migration error:", err);
  } finally {
    client.release();
  }
}
