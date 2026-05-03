import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const SYNC_SECRET = "cc-sync-dev-to-prod-2024";

const ts = (v: any) => (v && v !== "" ? new Date(v) : null);
const num = (v: any) => (v !== null && v !== undefined && v !== "" ? Number(v) : 0);
const bool = (v: any) => v === "t" || v === true || v === "true";
const str = (v: any) => (v && v !== "" ? v : null);

router.post("/sync/import", async (req, res) => {
  const { secret, userMap, newUsers, tableData } = req.body;

  if (secret !== SYNC_SECRET) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const results: Record<string, any> = { errors: [] };
  const remap = (id: string) => (userMap && userMap[id]) || id;

  // 1. Insert new users
  let userCount = 0;
  for (const u of newUsers || []) {
    try {
      await db.execute(sql`
        INSERT INTO users (id, name, email, password_hash, avatar, bio, college, program, year, phone, role,
          followers_count, following_count, posts_count, services, email_verified, banned, verified, verification_badge, created_at)
        VALUES (
          ${u.id}, ${u.name}, ${u.email}, ${u.password_hash},
          ${str(u.avatar)}, ${str(u.bio)}, ${str(u.college)}, ${str(u.program)},
          ${u.year ? parseInt(u.year) : null}, ${str(u.phone)}, ${u.role || "student"},
          ${num(u.followers_count)}, ${num(u.following_count)}, ${num(u.posts_count)},
          ${str(u.services)}, ${bool(u.email_verified)}, ${bool(u.banned)},
          ${bool(u.verified)}, ${str(u.verification_badge)}, ${ts(u.created_at)}
        )
        ON CONFLICT (email) DO NOTHING
      `);
      userCount++;
    } catch (e: any) {
      results.errors.push(`user ${u.email}: ${e.message}`);
    }
  }
  results.newUsers = userCount;

  // 2. Wallets (for new users only — seed users already have wallets in prod)
  let walletCount = 0;
  for (const w of tableData.wallets || []) {
    const mappedUserId = remap(w.user_id);
    if (mappedUserId === w.user_id) {
      // This is a new user's wallet (no mapping = already production ID or truly new)
      try {
        await db.execute(sql`
          INSERT INTO wallets (id, user_id, balance, locked_balance, created_at)
          VALUES (${w.id}, ${mappedUserId}, ${num(w.balance)}, ${num(w.locked_balance)}, ${ts(w.created_at)})
          ON CONFLICT (id) DO NOTHING
        `);
        walletCount++;
      } catch {}
    }
  }
  results.wallets = walletCount;

  // 3. Posts
  let postCount = 0;
  for (const p of tableData.posts || []) {
    try {
      await db.execute(sql`
        INSERT INTO posts (id, author_id, content, image, likes_count, comments_count, created_at)
        VALUES (${p.id}, ${remap(p.author_id)}, ${p.content}, ${str(p.image)},
          ${num(p.likes_count)}, ${num(p.comments_count)}, ${ts(p.created_at)})
        ON CONFLICT (id) DO NOTHING
      `);
      postCount++;
    } catch {}
  }
  results.posts = postCount;

  // 4. Comments
  let commentCount = 0;
  for (const c of tableData.comments || []) {
    try {
      await db.execute(sql`
        INSERT INTO comments (id, post_id, author_id, content, created_at)
        VALUES (${c.id}, ${c.post_id}, ${remap(c.author_id)}, ${c.content}, ${ts(c.created_at)})
        ON CONFLICT (id) DO NOTHING
      `);
      commentCount++;
    } catch {}
  }
  results.comments = commentCount;

  // 5. Likes
  let likeCount = 0;
  for (const l of tableData.likes || []) {
    try {
      await db.execute(sql`
        INSERT INTO likes (id, post_id, user_id, created_at)
        VALUES (${l.id}, ${l.post_id}, ${remap(l.user_id)}, ${ts(l.created_at)})
        ON CONFLICT (id) DO NOTHING
      `);
      likeCount++;
    } catch {}
  }
  results.likes = likeCount;

  // 6. Follows
  let followCount = 0;
  for (const f of tableData.follows || []) {
    try {
      await db.execute(sql`
        INSERT INTO follows (id, follower_id, following_id, created_at)
        VALUES (${f.id}, ${remap(f.follower_id)}, ${remap(f.following_id)}, ${ts(f.created_at)})
        ON CONFLICT (id) DO NOTHING
      `);
      followCount++;
    } catch {}
  }
  results.follows = followCount;

  // 7. Conversations
  let convCount = 0;
  for (const c of tableData.conversations || []) {
    try {
      await db.execute(sql`
        INSERT INTO conversations (id, participant1_id, participant2_id, last_message, last_message_at, created_at)
        VALUES (${c.id}, ${remap(c.participant1_id)}, ${remap(c.participant2_id)},
          ${str(c.last_message)}, ${ts(c.last_message_at)}, ${ts(c.created_at)})
        ON CONFLICT (id) DO NOTHING
      `);
      convCount++;
    } catch {}
  }
  results.conversations = convCount;

  // 8. Messages
  let msgCount = 0;
  for (const m of tableData.messages || []) {
    try {
      await db.execute(sql`
        INSERT INTO messages (id, conversation_id, sender_id, content, read, created_at)
        VALUES (${m.id}, ${m.conversation_id}, ${remap(m.sender_id)},
          ${m.content}, ${bool(m.read)}, ${ts(m.created_at)})
        ON CONFLICT (id) DO NOTHING
      `);
      msgCount++;
    } catch {}
  }
  results.messages = msgCount;

  // 9. Assignments
  let assignCount = 0;
  for (const a of tableData.assignments || []) {
    try {
      await db.execute(sql`
        INSERT INTO assignments (id, client_id, provider_id, subject, description, budget, status, deadline, file_url, created_at)
        VALUES (${a.id}, ${remap(a.client_id)}, ${str(a.provider_id) ? remap(a.provider_id) : null},
          ${a.subject}, ${a.description}, ${num(a.budget)}, ${a.status || "open"},
          ${str(a.deadline)}, ${str(a.file_url)}, ${ts(a.created_at)})
        ON CONFLICT (id) DO NOTHING
      `);
      assignCount++;
    } catch {}
  }
  results.assignments = assignCount;

  // 10. Deliveries
  let delivCount = 0;
  for (const d of tableData.deliveries || []) {
    try {
      await db.execute(sql`
        INSERT INTO deliveries (id, client_id, provider_id, pickup_location, drop_location, pickup_type, status, total_amount, created_at)
        VALUES (${d.id}, ${remap(d.client_id)}, ${str(d.provider_id) ? remap(d.provider_id) : null},
          ${d.pickup_location}, ${d.drop_location}, ${d.pickup_type || "outlet"},
          ${d.status || "open"}, ${num(d.total_amount)}, ${ts(d.created_at)})
        ON CONFLICT (id) DO NOTHING
      `);
      delivCount++;
    } catch {}
  }
  results.deliveries = delivCount;

  // 11. Tasks
  let taskCount = 0;
  for (const t of tableData.tasks || []) {
    try {
      await db.execute(sql`
        INSERT INTO tasks (id, client_id, provider_id, title, description, budget, status, created_at)
        VALUES (${t.id}, ${remap(t.client_id)}, ${str(t.provider_id) ? remap(t.provider_id) : null},
          ${t.title}, ${t.description}, ${num(t.budget)}, ${t.status || "open"}, ${ts(t.created_at)})
        ON CONFLICT (id) DO NOTHING
      `);
      taskCount++;
    } catch {}
  }
  results.tasks = taskCount;

  // 12. Outlet items
  let outletCount = 0;
  for (const o of tableData.outlet_items || []) {
    try {
      await db.execute(sql`
        INSERT INTO outlet_items (id, outlet_name, name, price, available, created_at)
        VALUES (${o.id}, ${o.outlet_name}, ${o.name}, ${num(o.price)},
          ${bool(o.available)}, ${ts(o.created_at)})
        ON CONFLICT (id) DO NOTHING
      `);
      outletCount++;
    } catch {}
  }
  results.outlet_items = outletCount;

  // 13. Coaching sessions
  let coachCount = 0;
  for (const c of tableData.coaching_sessions || []) {
    try {
      await db.execute(sql`
        INSERT INTO coaching_sessions (id, client_id, provider_id, subject, description, hourly_rate, status, scheduled_at, created_at)
        VALUES (${c.id}, ${remap(c.client_id)}, ${str(c.provider_id) ? remap(c.provider_id) : null},
          ${c.subject}, ${c.description}, ${num(c.hourly_rate)}, ${c.status || "open"},
          ${ts(c.scheduled_at)}, ${ts(c.created_at)})
        ON CONFLICT (id) DO NOTHING
      `);
      coachCount++;
    } catch {}
  }
  results.coaching_sessions = coachCount;

  res.json({ success: true, results });
});

export default router;
