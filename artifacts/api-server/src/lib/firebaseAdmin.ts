import * as admin from "firebase-admin";

let firebaseApp: admin.app.App | null = null;

function getApp(): admin.app.App {
  if (firebaseApp) return firebaseApp;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON env var not set");
  }

  const serviceAccount = JSON.parse(json) as admin.ServiceAccount;
  firebaseApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return firebaseApp;
}

export interface FcmSendResult {
  ok: boolean;
  shouldDeleteToken: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export async function sendFcmNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<FcmSendResult> {
  try {
    const app = getApp();
    const messageId = await admin.messaging(app).send({
      token,
      notification: { title, body },
      data,
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "default" },
      },
    });
    console.log(`[fcm] Sent OK: ${messageId}`);
    return { ok: true, shouldDeleteToken: false };
  } catch (err: any) {
    const code: string = err?.errorInfo?.code ?? err?.code ?? "";
    const message: string = err?.message ?? String(err);
    // Delete tokens that are permanently invalid (token-specific errors only;
    // do NOT include "invalid-argument" — that can fire on payload bugs too)
    const deletable =
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token";
    console.error(`[fcm] Send failed for token ${token.substring(0, 20)}... (code=${code}): ${message}`);
    return { ok: false, shouldDeleteToken: deletable, errorCode: code, errorMessage: message };
  }
}
