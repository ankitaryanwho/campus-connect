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

export async function sendFcmNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<boolean> {
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
    return true;
  } catch (err: any) {
    console.error(`[fcm] Send failed for token ${token.substring(0, 20)}...:`, err?.message ?? err);
    return false;
  }
}
