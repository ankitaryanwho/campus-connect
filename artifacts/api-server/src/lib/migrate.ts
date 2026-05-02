import crypto from "node:crypto";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "@workspace/db";

// Walk up from the executing file's directory to locate the monorepo root
// (the directory that contains pnpm-workspace.yaml). This works whether the
// server is started via tsx from the source tree (src/lib/migrate.ts) or via
// node from a compiled bundle (dist/index.cjs) at any working directory.
function resolveWorkspaceRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(`Cannot locate monorepo root (pnpm-workspace.yaml) starting from ${startDir}`);
}

const MIGRATIONS_FOLDER = path.join(
  resolveWorkspaceRoot(path.dirname(fileURLToPath(import.meta.url))),
  "lib/db/migrations"
);

export async function runStartupMigrations() {
  const client = await pool.connect();
  try {
    // ── Drizzle migration runner ──────────────────────────────────────────────
    // This project was originally set up with drizzle-kit push (no migration
    // files). Migration 0000 is a full schema bootstrap that cannot run on
    // existing databases (tables already exist). Migration 0001 adds the
    // performance indexes; it may also conflict on databases where a previous
    // version of this startup script already created those indexes via raw SQL.
    //
    // We baseline whichever migrations have already been applied so Drizzle
    // can take ownership of schema state going forward without re-running them.
    // Baseline hashes and timestamps are computed from the migration files on
    // disk — no hardcoded values.

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
      if (trackedTimestamps.has(entry.when)) {
        continue; // Already tracked — skip
      }

      const migSql = fs.readFileSync(
        path.join(MIGRATIONS_FOLDER, `${entry.tag}.sql`),
        "utf8"
      );

      // Detect whether this migration has already been applied to the DB by
      // checking for a side-effect that is unique to it:
      //   0000 — creates the `users` table
      //   0001 — creates the `posts_created_at_idx` index
      let alreadyApplied = false;
      if (entry.idx === 0) {
        const { rows } = await client.query<{ exists: boolean }>(`
          SELECT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'public' AND tablename = 'users'
          ) AS exists;
        `);
        alreadyApplied = rows[0]?.exists ?? false;
      } else if (entry.idx === 1) {
        const { rows } = await client.query<{ exists: boolean }>(`
          SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public' AND indexname = 'posts_created_at_idx'
          ) AS exists;
        `);
        alreadyApplied = rows[0]?.exists ?? false;
      }

      if (alreadyApplied) {
        const hash = crypto.createHash("sha256").update(migSql).digest("hex");
        await client.query(
          `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2);`,
          [hash, entry.when]
        );
        console.log(`[migrate] Baselined existing migration: ${entry.tag}`);
      }
    }

    // Run any migrations not yet tracked (e.g. new ones added after the initial
    // baseline, or the full 0000→0001 sequence on a fresh database).
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
  } finally {
    client.release();
  }
}
