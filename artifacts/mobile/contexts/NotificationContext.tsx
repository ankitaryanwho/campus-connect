import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";

const IS_NATIVE = Platform.OS !== "web";
const PUSH_TOKEN_STORAGE_KEY = "@push_token";

// Only set the notification handler on native — not supported on web
if (IS_NATIVE) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export interface RegisterResult {
  ok: boolean;
  token: string | null;
  reason: string; // human-readable explanation of what happened / failed
}

interface NotificationContextType {
  expoPushToken: string | null;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  forceRegisterPushToken: () => Promise<RegisterResult>;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  unreadCount: 0,
  setUnreadCount: () => {},
  forceRegisterPushToken: async () => ({ ok: false, token: null, reason: "Provider not mounted" }),
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token: authToken, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // ── Register push token (native only) ─────────────────────────────────────
  // Re-runs whenever the logged-in user changes so the device's FCM token is
  // always re-bound to the *current* account. Critical when two accounts share
  // a phone (e.g. tester + provider) — without this the token stays mapped to
  // whichever user logged in first.
  // Centralised registration helper. Returns a structured result so callers
  // (effect AND the manual "Test push" button) can surface the exact failure.
  const doRegister = async (currentAuthToken: string, currentUserId: string): Promise<RegisterResult> => {
    const result = await registerForPushNotificationsAsync();
    if (!result.token) {
      return result;
    }
    const token = result.token;
    setExpoPushToken(token);
    try {
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    } catch {}

    try {
      const API_BASE = process.env["EXPO_PUBLIC_API_URL"] || "https://colyx-app.replit.app/api";
      const res = await fetch(`${API_BASE}/notifications/push-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentAuthToken}`,
        },
        body: JSON.stringify({ token, platform: Platform.OS }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, token, reason: `Server rejected token (HTTP ${res.status}): ${text.slice(0, 80)}` };
      }
      console.log(`[push] Token registered with server for user ${currentUserId}`);
      return { ok: true, token, reason: "Registered" };
    } catch (e: any) {
      return { ok: false, token, reason: `Network error registering token: ${e?.message ?? String(e)}` };
    }
  };

  // Stable ref to the latest auth context so the manual "Test push" button can
  // call doRegister on demand without re-creating the function each render.
  const authRef = useRef<{ token: string | null; userId: string | null }>({ token: null, userId: null });
  authRef.current = { token: authToken ?? null, userId: user?.id ?? null };

  const forceRegisterPushToken = async (): Promise<RegisterResult> => {
    const t = authRef.current.token;
    const uid = authRef.current.userId;
    if (!IS_NATIVE) return { ok: false, token: null, reason: "Push notifications are not supported on web" };
    if (!t || !uid) return { ok: false, token: null, reason: "Not signed in" };
    return doRegister(t, uid);
  };

  useEffect(() => {
    if (!IS_NATIVE || !user?.id || !authToken) return;

    // Cancellation guard: a stale async registerToken() from a previous user
    // must not POST after the user has changed (which would re-bind the device
    // token to the wrong account and silently swap who gets notifications).
    let isActive = true;
    const userIdAtMount = user.id;
    const authTokenAtMount = authToken;

    const registerToken = async () => {
      const result = await doRegister(authTokenAtMount, userIdAtMount);
      if (!isActive) return;
      if (!result.ok) {
        console.warn(`[push] Auto-register failed: ${result.reason}`);
      }
    };

    registerToken();

    // Re-register whenever the app comes back to the foreground. Cheap and
    // self-healing: catches cases where the token was rotated by the OS, or
    // the device was used by another account in between.
    const appStateSub = AppState.addEventListener("change", (next) => {
      if (next === "active" && isActive) {
        registerToken();
      }
    });

    // Foreground notification listener — bump unread badge AND invalidate any
    // query that the push relates to so the recipient sees fresh data instantly
    // (without having to wait for the 30 s background poll).
    notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
      setUnreadCount((n) => n + 1);
      try {
        const data = (notif?.request?.content?.data ?? {}) as { screen?: string; tab?: string; itemId?: string };
        // Any service-screen-bound push (delivery status, booking change, chat
        // message, etc.) means the services-list and history caches are stale.
        if (data.screen === "/(tabs)/services") {
          queryClient.invalidateQueries({ queryKey: ["services", "all"] });
          queryClient.invalidateQueries({ queryKey: ["my-history"] });
          // If the push refers to a specific order, also invalidate its chat
          // cache so the open mini-chat panel refreshes immediately.
          if (data.itemId) {
            queryClient.invalidateQueries({ queryKey: ["order-chat", data.itemId] });
          }
        }
        // Wallet-related pushes invalidate wallet caches.
        if (data.screen === "/(tabs)/wallet") {
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
          queryClient.invalidateQueries({ queryKey: ["earnings"] });
        }
        // Notifications screen always wants a refresh.
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch {}
    });

    // Tap on notification listener (app foregrounded from notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationTap(response.notification.request.content.data);
    });

    return () => {
      appStateSub.remove();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authToken]);

  // ── Handle taps when app was killed / backgrounded (native only) ───────────
  useEffect(() => {
    if (!IS_NATIVE) return;

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleNotificationTap(response.notification.request.content.data);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNotificationTap(data: any) {
    if (!data) return;
    const { screen, tab, itemId, openOrderChat, orderType } = data as { screen?: string; tab?: string; itemId?: string; openOrderChat?: string; orderType?: string };

    if (!screen) return;

    setTimeout(() => {
      try {
        if (screen === "/(tabs)/services" && openOrderChat) {
          router.push({ pathname: "/(tabs)/services" as any, params: { tab: tab ?? "active", openOrderChat, orderType: orderType ?? "deliveries" } });
        } else if (screen === "/(tabs)/services" && tab) {
          router.push({ pathname: "/(tabs)/services" as any, params: { tab, itemId: itemId ?? "" } });
        } else if (screen === "/(tabs)/wallet") {
          router.push("/(tabs)/wallet" as any);
        } else if (screen === "/(tabs)/notifications") {
          router.push("/(tabs)/notifications" as any);
        } else {
          router.push(screen as any);
        }
      } catch (e) {
        console.warn("[push] navigation error", e);
      }
    }, 300);
  }

  return (
    <NotificationContext.Provider value={{ expoPushToken, unreadCount, setUnreadCount, forceRegisterPushToken }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerForPushNotificationsAsync(): Promise<RegisterResult> {
  if (!Device.isDevice) {
    return { ok: false, token: null, reason: "Push needs a physical device (simulator/emulator can't receive push)" };
  }

  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Colyx",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6366F1",
      });
    } catch (e: any) {
      // Channel setup failure shouldn't block — fall through.
      console.warn("[push] setNotificationChannelAsync failed:", e?.message ?? String(e));
    }
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return { ok: false, token: null, reason: "Notification permission denied. Open phone settings → Apps → Colyx → Notifications and turn ON." };
  }

  try {
    // Use native FCM token directly — works with Firebase Admin SDK on the server
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    console.log("[push] Got device push token type:", deviceToken.type);
    if (!deviceToken?.data || typeof deviceToken.data !== "string") {
      return { ok: false, token: null, reason: `Device returned an invalid push token (type=${deviceToken?.type ?? "unknown"})` };
    }
    return { ok: true, token: deviceToken.data, reason: `Got ${deviceToken.type} token` };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    return { ok: false, token: null, reason: `Could not get device push token: ${msg.slice(0, 120)}` };
  }
}
