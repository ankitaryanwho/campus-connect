import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { CACHE_TTL_MS, PERSISTED_CACHE_STORAGE_KEY, STARTUP_QUERY_KEYS } from "@/lib/queryCache";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/ApiError";
import { ToastProvider } from "@/contexts/ToastContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { OfflineQueueProvider } from "@/contexts/OfflineQueueContext";
import { useBatchStartup } from "@/hooks/useBatchStartup";

// Initialise Sentry before the component tree renders so all unhandled
// errors and React Native crashes are captured from the very first render.
// Safe no-op when EXPO_PUBLIC_SENTRY_DSN is not set (local development).
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? "development" : "production",
  });
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: CACHE_TTL_MS,
      retry: (count, error) => {
        if (error instanceof ApiError) {
          return count < 3 && (error.isNetworkError || error.isTimeout);
        }
        return count < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: PERSISTED_CACHE_STORAGE_KEY,
  throttleTime: 1000,
});

const startupQueryKeySet = new Set(
  STARTUP_QUERY_KEYS.map((k) => JSON.stringify(k)),
);

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const { isReady } = useBatchStartup();
  const segments = useSegments();

  // Keep the splash screen visible while:
  //   1. Auth is still loading from storage  (isLoading = true), OR
  //   2. A logged-in user's batch prefetch is still in flight (!isReady).
  // For logged-out users useBatchStartup sets isReady = true synchronously,
  // so the splash hides as soon as auth finishes loading — same as before.
  useEffect(() => {
    if (!isLoading && isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading, isReady]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  // While a returning user's batch is in flight, render nothing — the splash
  // screen is still covering the app so there is no blank-screen flash.
  // Logged-out users and users whose batch has completed render normally.
  if (user && !isReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="post/[id]" options={{ presentation: "card", headerShown: false }} />
      <Stack.Screen name="profile/[id]" options={{ presentation: "card", headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ presentation: "card", headerShown: false }} />
      <Stack.Screen name="chatroom/[id]" options={{ presentation: "card", headerShown: false }} />
      <Stack.Screen name="new-post" options={{ presentation: "formSheet", sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true, headerShown: false }} />
    </Stack>
  );
}

function RootLayout() {
  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (__DEV__) return;
    Updates.checkForUpdateAsync()
      .then(update => {
        if (update.isAvailable) return Updates.fetchUpdateAsync();
      })
      .catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: CACHE_TTL_MS,
            dehydrateOptions: {
              shouldDehydrateQuery: (query) =>
                startupQueryKeySet.has(JSON.stringify(query.queryKey)),
            },
          }}
        >
          <AuthProvider>
            <OfflineQueueProvider>
              <NotificationProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <ToastProvider>
                      <RootLayoutNav />
                    </ToastProvider>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </NotificationProvider>
            </OfflineQueueProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// Sentry.wrap adds a top-level error boundary and registers the component
// as the app root for React Native crash reporting. It is safe to call even
// when Sentry.init() was not called (DSN not set) — it just passes through.
export default Sentry.wrap(RootLayout);
