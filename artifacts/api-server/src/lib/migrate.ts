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
    // Drizzle tracks applied migrations in "__drizzle_migrations". On an
    // existing database (set up before migration tracking was added) the
    // initial migration contains CREATE TABLE statements that would fail
    // because the tables already exist.
    //
    // Strategy: if the users table already exists and no migrations have been
    // tracked yet, insert a baseline record so Drizzle skips the initial
    // migration and only runs new ones going forward.
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
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
      `SELECT id FROM "__drizzle_migrations" LIMIT 1;`
    );

    if (tableCheck[0]?.exists && migrationCheck.length === 0) {
      // Existing database without migration history — baseline the initial
      // migration so Drizzle does not try to re-create existing tables.
      // The created_at value MUST equal or exceed the migration's `when`
      // timestamp from _journal.json (1777746134296) so Drizzle's
      // `created_at < folderMillis` check evaluates to false and skips it.
      await client.query(
        `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2);`,
        ["0000_furry_dark_beast", 1777746134296]
      );
      console.log("[migrate] Baselined existing database");
    }

    const db = drizzle(client);
    try {
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
      console.log("[migrate] Drizzle migrations up to date");
    } catch (err: any) {
      // On databases created before migration tracking was introduced, the
      // initial migration contains plain CREATE TABLE statements that fail
      // because the tables already exist. This is expected and safe — all
      // indexes are applied idempotently by the raw SQL section below.
      if (err?.cause?.code === "42P07" || err?.cause?.message?.includes("already exists")) {
        console.log("[migrate] Skipping Drizzle baseline migration (existing database)");
      } else {
        throw err;
      }
    }

    // ── Legacy / supplemental raw SQL ─────────────────────────────────────────
    // Tables and indexes created before migration tracking was introduced.
    // All statements are idempotent (IF NOT EXISTS) so they are safe to run
    // on every startup alongside the Drizzle runner above.

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

    // ── Performance indexes ────────────────────────────────────────────────────
    // Mirrors the indexes declared in the Drizzle schema and generated
    // migration. All use IF NOT EXISTS so they are safe on every startup.
    await client.query(`
      CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS posts_author_created_at_idx ON posts(author_id, created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx ON messages(conversation_id, created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS messages_chatroom_id_created_at_idx ON messages(chatroom_id, created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS likes_post_id_user_id_idx ON likes(post_id, user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS conversations_participants_idx ON conversations(participant1_id, participant2_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS follows_follower_following_idx ON follows(follower_id, following_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS order_messages_order_id_created_at_idx ON order_messages(order_id, created_at DESC);
    `);

    console.log("[migrate] Startup migrations complete");
  } catch (err) {
    console.error("[migrate] Startup migration error:", err);
  } finally {
    client.release();
  }
}
