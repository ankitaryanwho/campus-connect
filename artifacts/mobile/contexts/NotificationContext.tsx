import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthContext";

const IS_NATIVE = Platform.OS !== "web";

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

interface NotificationContextType {
  expoPushToken: string | null;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  unreadCount: 0,
  setUnreadCount: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token: authToken, user } = useAuth();
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // ── Register push token (native only) ─────────────────────────────────────
  useEffect(() => {
    if (!IS_NATIVE || !user || !authToken) return;

    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return;
      setExpoPushToken(token);

      try {
        const API_BASE = "https://campus-connect-aryan.replit.app/api";
        await fetch(`${API_BASE}/notifications/push-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token, platform: Platform.OS }),
        });
        console.log("[push] Token registered with server");
      } catch (e) {
        console.warn("[push] Failed to register token with server", e);
      }
    });

    // Foreground notification listener
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      setUnreadCount((n) => n + 1);
    });

    // Tap on notification listener (app foregrounded from notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationTap(response.notification.request.content.data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authToken]);

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
    <NotificationContext.Provider value={{ expoPushToken, unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[push] Must use a physical device for push notifications");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "CampusConnect",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6366F1",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[push] Permission not granted");
    return null;
  }

  try {
    // Use native FCM token directly — works with Firebase Admin SDK on the server
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    console.log("[push] Got device FCM token type:", deviceToken.type);
    return deviceToken.data as string;
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.warn("[push] Could not get device push token:", msg);
    return null;
  }
}
