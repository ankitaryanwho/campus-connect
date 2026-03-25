import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function runMigrations() {
  try {
    await db.execute(sql`
      UPDATE assignments
      SET status = 'open', booked_by_id = NULL
      WHERE status != 'open'
    `);
    await db.execute(sql`
      UPDATE certifications
      SET status = 'open', booked_by_id = NULL
      WHERE status != 'open'
    `);
    await db.execute(sql`
      UPDATE projects
      SET status = 'open', booked_by_id = NULL
      WHERE status != 'open'
    `);
    console.log("Migration: academic listing statuses normalised to open");
  } catch (err) {
    console.error("Migration error (non-fatal):", err);
  }
}
