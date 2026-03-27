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

// ─── Send via Expo Push API (for ExponentPushToken format) ───────────────────

async function sendViaExpoPush(tokens: string[], title: string, body: string, data: Record<string, string> = {}) {
  const messages = tokens.map(to => ({ to, title, body, data, sound: "default", priority: "high" }));
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const result = await response.json() as any;
    const items = Array.isArray(result?.data) ? result.data : [result?.data].filter(Boolean);
    items.forEach((item: any, i: number) => {
      if (item?.status === "error") {
        console.error(`[push/expo] Token ${tokens[i]?.substring(0, 30)} failed: ${item.message}`);
      } else {
        console.log(`[push/expo] Sent to ${tokens[i]?.substring(0, 30)}: ${item?.status}`);
      }
    });
  } catch (err) {
    console.error("[push/expo] Failed:", err);
  }
}

// ─── Route each token to the right sender ─────────────────────────────────────

async function sendPushNotifications(tokens: string[], title: string, body: string, data: Record<string, string> = {}) {
  if (!tokens.length) return;

  const expoTokens = tokens.filter(t => t.startsWith("ExponentPushToken["));
  const fcmTokens = tokens.filter(t => !t.startsWith("ExponentPushToken["));

  if (expoTokens.length > 0) {
    await sendViaExpoPush(expoTokens, title, body, data);
  }
  if (fcmTokens.length > 0) {
    await Promise.all(fcmTokens.map(t => sendFcmNotification(t, title, body, data)));
  }
}

// ─── Public helper ────────────────────────────────────────────────────────────

export async function notifyUser(userId: string, payload: NotifyPayload) {
  try {
    await db.insert(notificationsTable).values({
      id: generateId(),
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ? JSON.stringify(payload.data) : null,
    });

    const tokens = await getPushTokens(userId);
    if (tokens.length) {
      await sendPushNotifications(tokens, payload.title, payload.body, payload.data ?? {});
    }
  } catch (err) {
    console.error("[notify] Error notifying user:", err);
  }
}

export async function notifyUsers(userIds: string[], payload: NotifyPayload) {
  await Promise.all(userIds.map(uid => notifyUser(uid, payload)));
}
