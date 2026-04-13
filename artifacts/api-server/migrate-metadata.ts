import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb`);
  console.log("✅ Added metadata column to messages");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
