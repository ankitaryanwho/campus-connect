import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";

const router = Router();

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
    res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to mark notification" });
  }
});

export default router;
