import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";
import { sendFcmNotification } from "../lib/firebaseAdmin";

const router = Router();

// ─── Test push notification (diagnostic) ─────────────────────────────────────

router.post("/test", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const rows = await db.execute(
      `SELECT token, platform FROM push_tokens WHERE user_id = '${userId.replace(/'/g, "''")}'`
    ) as any;
    const tokens = (Array.isArray(rows) ? rows : rows?.rows ?? []) as Array<{ token: string; platform: string }>;

    const firebaseConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    const results = [];
    for (const row of tokens) {
      if (row.token.startsWith("ExponentPushToken[")) {
        results.push({ token: row.token.substring(0, 30) + "...", type: "expo-legacy", status: "skipped" });
        continue;
      }
      const r = await sendFcmNotification(
        row.token,
        "CampusConnect Test",
        "If you see this, push notifications are working!",
        { screen: "/(tabs)/notifications" }
      );
      results.push({
        token: row.token.substring(0, 30) + "...",
        type: "fcm",
        platform: row.platform,
        ok: r.ok,
        errorCode: r.errorCode,
        errorMessage: r.errorMessage,
      });
    }

    res.json({
      userId,
      firebaseConfigured,
      tokenCount: tokens.length,
      results,
    });
  } catch (err: any) {
    console.error("[push/test]", err);
    res.status(500).json({ error: "ServerError", message: err?.message ?? String(err) });
  }
});

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
    const notificationId = req.params["notificationId"] as string;
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
//
// Critical: scope the delete to (token AND user_id). Without this, a delayed
// logout request from account A could arrive AFTER account B has already
// re-bound the same token via the upsert in POST /push-token, and wipe out
// B's mapping — silently breaking push for B until next foreground re-register.
router.delete("/push-token", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { token } = req.body;
    if (token && userId) {
      await db.execute(
        `DELETE FROM push_tokens WHERE token = '${String(token).replace(/'/g, "''")}' AND user_id = '${String(userId).replace(/'/g, "''")}'`
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to remove token" });
  }
});

export default router;
