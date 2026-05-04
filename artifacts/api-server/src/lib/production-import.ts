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

export interface ImportResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  tables?: Record<string, { imported: number; total: number; errors: number }>;
  error?: string;
}

export async function runProductionImport(forceOverride?: boolean): Promise<ImportResult> {
  const sourceUrl = process.env.NEON_SOURCE_URL || process.env.PROD_DATABASE_URL;
  if (!sourceUrl) {
    console.log("[import] Source DB URL not set (NEON_SOURCE_URL or PROD_DATABASE_URL) — skipping.");
    return { success: true, skipped: true, reason: "Source DB URL not set" };
  }

  const force = forceOverride ?? (process.env.NEON_FORCE_IMPORT === "true");
  const destClient = await pool.connect();

  if (!force) {
    try {
      const check = await destClient.query(`SELECT COUNT(*) FROM users WHERE id != 'admin-001'`);
      if (parseInt(check.rows[0].count) > 0) {
        console.log("[import] Database already has data — skipping.");
        destClient.release();
        return { success: true, skipped: true, reason: "Database already has non-admin users" };
      }
    } catch (err: any) {
      destClient.release();
      return { success: false, error: `Pre-check failed: ${err.message}` };
    }
  }

  console.log(`[import] Starting import from Neon source database (force=${force})...`);

  const sourcePool = new Pool({ connectionString: sourceUrl });
  let sourceClient: any;
  try {
    sourceClient = await sourcePool.connect();
  } catch (connErr: any) {
    await sourcePool.end().catch(() => {});
    destClient.release();
    console.warn(`[import] Cannot connect to Neon source — skipping: ${connErr.message}`);
    return { success: true, skipped: true, reason: `Neon source unreachable: ${connErr.message}` };
  }
  const tableResults: Record<string, { imported: number; total: number; errors: number }> = {};

  try {
    await destClient.query("BEGIN");

    if (force) {
      console.log("[import] Force mode: clearing all existing data...");
      const reversed = [...TABLES_IN_ORDER].reverse();
      for (const table of reversed) {
        try {
          await destClient.query(`TRUNCATE TABLE ${table} CASCADE`);
        } catch (e: any) {
          console.warn(`[import] Could not truncate ${table}: ${e.message}`);
        }
      }
      console.log("[import] Tables cleared.");
    }

    for (const table of TABLES_IN_ORDER) {
      let rows: any[];
      try {
        const result = await sourceClient.query(`SELECT * FROM ${table}`);
        rows = result.rows;
      } catch (err: any) {
        console.warn(`[import] Skipping table ${table}: ${err.message}`);
        continue;
      }

      if (rows.length === 0) {
        tableResults[table] = { imported: 0, total: 0, errors: 0 };
        continue;
      }

      const destColsResult = await destClient.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [table]
      );
      const destCols = new Set(destColsResult.rows.map((r: any) => r.column_name));
      const sourceCols = Object.keys(rows[0]).filter((c) => destCols.has(c));

      if (sourceCols.length === 0) {
        tableResults[table] = { imported: 0, total: rows.length, errors: 0 };
        continue;
      }

      let inserted = 0;
      let errors = 0;
      let savepointCount = 0;

      for (const row of rows) {
        const vals = sourceCols.map((c) => row[c]);
        const placeholders = sourceCols.map((_, i) => `$${i + 1}`).join(", ");
        const colList = sourceCols.join(", ");
        const sp = `sp_${savepointCount++}`;
        try {
          await destClient.query(`SAVEPOINT ${sp}`);
          await destClient.query(
            `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            vals
          );
          await destClient.query(`RELEASE SAVEPOINT ${sp}`);
          inserted++;
        } catch (err: any) {
          await destClient.query(`ROLLBACK TO SAVEPOINT ${sp}`);
          errors++;
          if (errors <= 3) {
            console.warn(`[import] Row error in ${table}: ${err.message}`);
          }
        }
      }
      tableResults[table] = { imported: inserted, total: rows.length, errors };
      console.log(`[import] ${table}: ${inserted}/${rows.length} imported (${errors} errors)`);
    }

    await destClient.query("COMMIT");
    console.log("[import] Import complete.");
    return { success: true, tables: tableResults };
  } catch (err: any) {
    try { await destClient.query("ROLLBACK"); } catch {}
    console.error("[import] Import failed:", err);
    return { success: false, error: err.message };
  } finally {
    sourceClient.release();
    await sourcePool.end();
    destClient.release();
  }
}
