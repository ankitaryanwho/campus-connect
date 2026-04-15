import { pool } from "@workspace/db";

export async function runStartupMigrations() {
  const client = await pool.connect();
  try {
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
    console.log("[migrate] Startup migrations complete");
  } catch (err) {
    console.error("[migrate] Startup migration error:", err);
  } finally {
    client.release();
  }
}
