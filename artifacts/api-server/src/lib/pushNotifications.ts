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

// ─── Delete a stale/invalid token from DB ─────────────────────────────────────

async function deleteToken(token: string) {
  try {
    await db.execute(`DELETE FROM push_tokens WHERE token = '${token.replace(/'/g, "''")}'`);
    console.log(`[push] Removed stale token: ${token.substring(0, 30)}...`);
  } catch (e) {
    console.error("[push] Failed to delete stale token:", e);
  }
}

// ─── Route each token to the right sender ─────────────────────────────────────

async function sendPushNotifications(tokens: string[], title: string, body: string, data: Record<string, string> = {}) {
  if (!tokens.length) return;

  // App now uses native FCM tokens via getDevicePushTokenAsync().
  // Old ExponentPushToken[...] entries are stale legacy tokens — delete them.
  const expoTokens = tokens.filter(t => t.startsWith("ExponentPushToken["));
  const fcmTokens = tokens.filter(t => !t.startsWith("ExponentPushToken["));

  if (expoTokens.length > 0) {
    await Promise.all(expoTokens.map(t => deleteToken(t)));
  }

  if (fcmTokens.length > 0) {
    await Promise.all(fcmTokens.map(async (t) => {
      const result = await sendFcmNotification(t, title, body, data);
      if (result.shouldDeleteToken) {
        await deleteToken(t);
      }
    }));
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
    } else {
      // No push tokens registered for this user — in-app notification was still saved,
      // but no banner will appear on their device. Common causes: never opened the app,
      // denied notification permission, or another account stole the device's token.
      console.warn(`[notify] No push tokens for user ${userId} (type=${payload.type}) — in-app only`);
    }
  } catch (err) {
    console.error("[notify] Error notifying user:", err);
  }
}

export async function notifyUsers(userIds: string[], payload: NotifyPayload) {
  await Promise.all(userIds.map(uid => notifyUser(uid, payload)));
}
