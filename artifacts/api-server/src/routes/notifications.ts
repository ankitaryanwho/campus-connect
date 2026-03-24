import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";

const router = Router();

// ─── Get notifications ────────────────────────────────────────────────────────

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const notifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt));
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const formatted = notifications.map(n => ({ ...n, data: n.data ? JSON.parse(n.data) : null }));
    res.json({ notifications: formatted, unreadCount });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get notifications" });
  }
});

router.post("/:notificationId/read", authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, notificationId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to mark notification" });
  }
});

router.post("/read-all", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, userId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to mark all read" });
  }
});

// ─── Register / update push token ────────────────────────────────────────────

router.post("/push-token", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { token, platform } = req.body;
    if (!token) { res.status(400).json({ error: "token required" }); return; }

    // Upsert: if token already exists update user_id; if new insert
    await db.execute(
      `INSERT INTO push_tokens (id, user_id, token, platform, updated_at)
       VALUES ('${generateId()}', '${userId}', '${token.replace(/'/g, "''")}', '${(platform || "").replace(/'/g, "''")}', now())
       ON CONFLICT (token) DO UPDATE SET user_id = '${userId}', updated_at = now()`
    );
    res.json({ success: true });
  } catch (err) {
    console.error("[push-token]", err);
    res.status(500).json({ error: "ServerError", message: "Failed to register token" });
  }
});

// ─── Remove push token (logout) ───────────────────────────────────────────────

router.delete("/push-token", authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      await db.execute(`DELETE FROM push_tokens WHERE token = '${token.replace(/'/g, "''")}'`);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to remove token" });
  }
});

export default router;
