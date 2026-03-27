import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { generateId } from "./id";
import { sendFcmNotification } from "./firebaseAdmin";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotifyPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ─── Get push tokens for a user ───────────────────────────────────────────────

async function getPushTokens(userId: string): Promise<string[]> {
  try {
    const rows = await db.execute(
      `SELECT token FROM push_tokens WHERE user_id = '${userId.replace(/'/g, "''")}'`
    ) as any;
    const result = Array.isArray(rows) ? rows : rows?.rows ?? [];
    return result.map((r: any) => r.token).filter(Boolean);
  } catch {
    return [];
  }
}

// ─── Send via Firebase Admin (direct FCM) ────────────────────────────────────

async function sendPushNotifications(tokens: string[], title: string, body: string, data: Record<string, string> = {}) {
  if (!tokens.length) return;
  await Promise.all(tokens.map(token => sendFcmNotification(token, title, body, data)));
}

// ─── Public helper ────────────────────────────────────────────────────────────
// Saves an in-app notification AND sends a real push notification.

export async function notifyUser(userId: string, payload: NotifyPayload) {
  try {
    // 1. Save in-app notification
    await db.insert(notificationsTable).values({
      id: generateId(),
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ? JSON.stringify(payload.data) : null,
    });

    // 2. Send push (best-effort)
    const tokens = await getPushTokens(userId);
    if (tokens.length) {
      await sendPushNotifications(tokens, payload.title, payload.body, payload.data ?? {});
    }
  } catch (err) {
    console.error("[notify] Error notifying user:", err);
  }
}

// ─── Notify multiple users at once ───────────────────────────────────────────

export async function notifyUsers(userIds: string[], payload: NotifyPayload) {
  await Promise.all(userIds.map(uid => notifyUser(uid, payload)));
}
