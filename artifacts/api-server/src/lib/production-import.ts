import { Pool } from "pg";
import { pool } from "@workspace/db";

const TABLES_IN_ORDER = [
  "users",
  "wallets",
  "chatrooms",
  "posts",
  "follows",
  "likes",
  "comments",
  "conversations",
  "messages",
  "otp_codes",
  "push_tokens",
  "notifications",
  "assignments",
  "certifications",
  "projects",
  "coaching_sessions",
  "deliveries",
  "outlet_items",
  "tasks",
  "task_applications",
  "transactions",
  "service_bookings",
  "order_messages",
];

export async function runProductionImport() {
  const sourceUrl = process.env.NEON_SOURCE_URL;
  if (!sourceUrl) return;

  const destClient = await pool.connect();
  try {
    const check = await destClient.query(`SELECT COUNT(*) FROM users WHERE id != 'admin-001'`);
    if (parseInt(check.rows[0].count) > 0) {
      console.log("[import] Production database already has data — skipping import.");
      return;
    }
  } catch {
    destClient.release();
    return;
  }

  console.log("[import] Starting production data import from source database...");

  const sourcePool = new Pool({ connectionString: sourceUrl });
  const sourceClient = await sourcePool.connect();

  try {
    await destClient.query("BEGIN");
    await destClient.query("SET session_replication_role = replica");

    for (const table of TABLES_IN_ORDER) {
      let rows: any[];
      try {
        const result = await sourceClient.query(`SELECT * FROM ${table}`);
        rows = result.rows;
      } catch (err: any) {
        console.warn(`[import] Skipping table ${table}: ${err.message}`);
        continue;
      }

      if (rows.length === 0) continue;

      const destColsResult = await destClient.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [table]
      );
      const destCols = new Set(destColsResult.rows.map((r: any) => r.column_name));
      const sourceCols = Object.keys(rows[0]).filter((c) => destCols.has(c));

      if (sourceCols.length === 0) continue;

      let inserted = 0;
      for (const row of rows) {
        const vals = sourceCols.map((c) => row[c]);
        const placeholders = sourceCols.map((_, i) => `$${i + 1}`).join(", ");
        const colList = sourceCols.join(", ");
        try {
          await destClient.query(
            `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            vals
          );
          inserted++;
        } catch {
        }
      }
      console.log(`[import] ${table}: ${inserted}/${rows.length} rows imported`);
    }

    await destClient.query("SET session_replication_role = DEFAULT");
    await destClient.query("COMMIT");
    console.log("[import] Production import complete.");
  } catch (err) {
    await destClient.query("ROLLBACK");
    console.error("[import] Import failed, rolled back:", err);
  } finally {
    sourceClient.release();
    await sourcePool.end();
    destClient.release();
  }
}
