import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { generateId } from "./id";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotifyPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ─── Send Expo Push Notification ─────────────────────────────────────────────

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

async function sendExpoPush(tokens: string[], title: string, body: string, data: Record<string, string> = {}) {
  if (!tokens.length) return;
  const messages = tokens.map(to => ({ to, title, body, data, sound: "default", priority: "high" }));
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
      body: JSON.stringify(messages),
    });
    const result = await response.json() as any;
    const items = Array.isArray(result?.data) ? result.data : [result?.data].filter(Boolean);
    items.forEach((item: any, i: number) => {
      if (item?.status === "error") {
        console.error(`[push] Token ${tokens[i]} failed: ${item.message} (${item.details?.error})`);
      } else {
        console.log(`[push] Sent to ${tokens[i]}: ${item?.status}`);
      }
    });
  } catch (err) {
    console.error("[push] Failed to send:", err);
  }
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
      await sendExpoPush(tokens, payload.title, payload.body, payload.data ?? {});
    }
  } catch (err) {
    console.error("[notify] Error notifying user:", err);
  }
}

// ─── Notify multiple users at once ───────────────────────────────────────────

export async function notifyUsers(userIds: string[], payload: NotifyPayload) {
  await Promise.all(userIds.map(uid => notifyUser(uid, payload)));
}
